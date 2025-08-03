const LeaveRequest = require('../models/leaveRequest');
const Adjustment = require('../models/adjustment');
const Lectures = require('../models/lectures');
const User = require('../models/users');
const Notification = require('../models/notification');

async function submitLeaveRequest(req, res) {
    const { leaveDate, leaveReason, teacher } = req.body;
    if (!leaveDate || !leaveReason) {
        return res.status(400).json({ error: 'Date and reason are required' });
    }
    try {
        const leaveRequest = await LeaveRequest.create({
            teacher: teacher || req.user.username,
            date: new Date(leaveDate),
            reason: leaveReason,
            status: 'pending',
        });
        
        const lectures = await Lectures.find({
            teacher: teacher || req.user.username,
            date: new Date(leaveDate)
        });
        
        const substituteAssignments = [];
        let adjustmentsCreated = 0;
        
        for (const lecture of lectures) {
            const substituteInfo = await findAndAssignSubstitute(lecture, new Date(leaveDate));
            substituteAssignments.push(substituteInfo);
            
            await Adjustment.create({
                teacher: teacher || req.user.username,
                subject: lecture.subject,
                slot: lecture.slot,
                room: lecture.room,
                date: new Date(leaveDate),
                status: substituteInfo.assigned ? 'pending' : 'no_substitute',
                LeaveRequestId: leaveRequest._id,
                substituteTeacher: substituteInfo.substituteTeacher || null,
                notes: substituteInfo.notes || null
            });
            adjustmentsCreated++;
        }
        
        res.json({
            success: true,
            message: `Leave request submitted. ${adjustmentsCreated} lectures processed.`,
            adjustmentsCreated,
            substituteAssignments,
            summary: generateSubstituteSummary(substituteAssignments)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getMyLeaveRequests(req, res) {
    try {
        const currentUser = req.user.username;
        const leaveRequests = await LeaveRequest.find({ teacher: currentUser });
        const result = [];
        
        for (let i = 0; i < leaveRequests.length; i++) {
            const request = leaveRequests[i];
            const adjustments = await Adjustment.find({ LeaveRequestId: request._id });
            
            const adjustmentsWithSubstitutes = adjustments.map(adj => {
                const adjustmentData = adj.toObject();
                
                let substituteInfo = null;
                if (adj.substituteTeacher) {
                    substituteInfo = {
                        teacher: adj.substituteTeacher,        
                        notes: adj.assignmentNotes,          
                        status: adj.status                    
                    };
                }
                
                return {
                    ...adjustmentData,  
                    substituteInfo: substituteInfo  
                };
            });
            
            const leaveRequestWithAdjustments = {
                _id: request._id,
                teacher: request.teacher,
                date: request.date,
                reason: request.reason,
                status: request.status,
                adjustments: adjustmentsWithSubstitutes
            };
            
            result.push(leaveRequestWithAdjustments);
        }
        res.json(result);
        
    } catch (err) {
        console.error('Error getting leave requests:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getAllLeaveRequests(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
        const leaveRequests = await LeaveRequest.find({});
        const result = [];
        
        for (const request of leaveRequests) {
            const adjustments = await Adjustment.find({ LeaveRequestId: request._id });
            
            const adjustmentsWithSubstitutes = adjustments.map(adj => {
                const adjustmentData = adj.toObject();
                
                let substituteInfo = null;
                if (adj.substituteTeacher) {
                    substituteInfo = {
                        teacher: adj.substituteTeacher,        
                        notes: adj.assignmentNotes,          
                        status: adj.status            
                    };
                }
                return {
                    ...adjustmentData,  
                    substituteInfo: substituteInfo  
                };
            });
            const leaveRequestWithDetails = {
                ...request.toObject(),  
                adjustments: adjustmentsWithSubstitutes,  
                substituteSummary: generateAdjustmentSummary(adjustmentsWithSubstitutes)  
            };
            result.push(leaveRequestWithDetails);
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

function generateAdjustmentSummary(adjustments) {
    const assigned = adjustments.filter(a => a.substituteTeacher);
    const notAssigned = adjustments.filter(a => !a.substituteTeacher);
    
    return {
        total: adjustments.length,
        assigned: assigned.length,
        notAssigned: notAssigned.length,
        details: adjustments.map(adj => ({
            subject: adj.subject,
            slot: adj.slot,
            room: adj.room,
            substituteTeacher: adj.substituteTeacher || 'No substitute assigned',
            status: adj.status,
            notes: adj.assignmentNotes
        }))
    };
}

async function updateLeaveRequestStatus(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        const leaveRequest = await LeaveRequest.findById(req.params.id);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        leaveRequest.status = status;
        await leaveRequest.save();

        const adjustments = await Adjustment.find({ LeaveRequestId: req.params.id });
        for (const adj of adjustments) {
            adj.status = status === 'approved' ? 'pending' : 'cancelled';
            await adj.save();
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

async function getPendingAdjustments(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const adjustments = await Adjustment.find({ 
            status: { $in: ['pending', 'pending_approval'] }
        }).populate('LeaveRequestId');
        
        const adjustmentsWithDetails = adjustments.map(adj => ({
            ...adj.toObject(),
            leaveReason: adj.LeaveRequestId ? adj.LeaveRequestId.reason : 'No reason provided'
        }));
        
        res.json(adjustmentsWithDetails);
    } catch (err) {
        console.error('Get adjustments error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function assignSubstituteTeacher(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { adjustmentId, substituteTeacher, adjustmentNotes } = req.body;
    
    console.log('Received data:', {
        adjustmentId: adjustmentId,
        substituteTeacher: substituteTeacher,
        adjustmentNotes: adjustmentNotes,
        body: req.body
    });
    
    try {
        const adjustment = await Adjustment.findById(adjustmentId);
        if (!adjustment) {
            return res.status(404).json({ error: 'Adjustment not found' });
        }
        const originalTeacher = adjustment.teacher;
        const subject = adjustment.subject;
        const eligibleTeacher = await User.findOne({ 
            username: substituteTeacher, 
            role: 'teacher'
        });
        if (!eligibleTeacher) {
            return res.status(400).json({ error: 'Selected substitute teacher not found' });
        }
        const notification = await Notification.create({
            recipient: substituteTeacher,
            sender: req.user.username,
            type: 'substitute_request',
            title: 'Substitute Teaching Request',
            message: `You have been requested to substitute for ${originalTeacher} in ${subject} on ${new Date(adjustment.date).toLocaleDateString()} at ${adjustment.slot} in room ${adjustment.room}.`,
            adjustmentId: adjustmentId
        });
        
        await Adjustment.findByIdAndUpdate(adjustmentId, {
            substituteTeacher: substituteTeacher,
            notes: adjustmentNotes,
            status: 'pending_approval',
            assignedAt: new Date()
        });

        res.json({ 
            success: true, 
            message: 'Substitute request sent to teacher. Waiting for approval.',
            notificationId: notification._id
        });
    } catch (err) {
        console.error('Assign substitute error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function resolveAdjustment(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const adjustment = await Adjustment.findById(req.params.id);
        if (!adjustment) {
            return res.status(404).json({ error: 'Adjustment not found' });
        }
        adjustment.status = 'resolved';
        adjustment.resolvedAt = new Date();
        await adjustment.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Resolve adjustment error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function findAndAssignSubstitute(lecture, leaveDate) {
    const { subject, slot, room, teacher: originalTeacher } = lecture;
    
    try {
        const subjectTeachers = await User.find({ 
            role: 'teacher', 
            subject: subject,
            username: { $ne: originalTeacher } 
        });
        
        if (subjectTeachers.length === 0) {
            return {
                lecture: `${subject} (${slot}) - Room ${room}`,
                assigned: false,
                substituteTeacher: null,
                reason: 'No teacher available for this subject',
                notes: `No other teacher found who can teach ${subject}`
            };
        }
        
        const lecturesInSlot = await Lectures.find({
            date: leaveDate,
            slot: slot
        });
        
        const busyTeachers = lecturesInSlot.map(l => l.teacher);
        const availableSubjectTeachers = subjectTeachers.filter(t => 
            !busyTeachers.includes(t.username)
        );
        
        if (availableSubjectTeachers.length === 0) {
            const busySubjectTeachers = subjectTeachers.filter(t => 
                busyTeachers.includes(t.username)
            );
            
            return {
                lecture: `${subject} (${slot}) - Room ${room}`,
                assigned: false,
                substituteTeacher: null,
                reason: 'Subject teacher not available for this time slot',
                notes: `All ${subject} teachers are busy during ${slot}`
            };
        }
        
        const substituteTeacher = availableSubjectTeachers[0];
        return {
            lecture: `${subject} (${slot}) - Room ${room}`,
            assigned: true,
            substituteTeacher: substituteTeacher.username,
            reason: 'Assigned subject teacher',
            notes: `${substituteTeacher.username} assigned to teach ${subject}`
        };
        
    } catch (err) {
        console.error('Error finding substitute:', err);
        return {
            lecture: `${subject} (${slot}) - Room ${room}`,
            assigned: false,
            substituteTeacher: null,
            reason: 'Error occurred while finding substitute',
            notes: 'System error during substitute assignment'
        };
    }
}

function generateSubstituteSummary(assignments) {
    const assigned = assignments.filter(a => a.assigned);
    const notAssigned = assignments.filter(a => !a.assigned);
    
    let summary = `Substitute Assignment Summary:\n`;
    summary += `Total lectures: ${assignments.length}\n`;
    summary += `Successfully assigned: ${assigned.length}\n`;
    summary += `No substitute available: ${notAssigned.length}\n\n`;
    
    if (assigned.length > 0) {
        summary += `Assigned Substitutes:\n`;
        assigned.forEach(assignment => {
            summary += `• ${assignment.lecture} → ${assignment.substituteTeacher}\n`;
        });
        summary += `\n`;
    }
    
    if (notAssigned.length > 0) {
        summary += `Unassigned Lectures:\n`;
        notAssigned.forEach(assignment => {
            summary += `• ${assignment.lecture} → ${assignment.reason}\n`;
        });
    }
    
    return summary;
}

async function getAvailableTeachers(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const {date, slot, subject} = req.query;
    try {
        let teacherQuery = { role: 'teacher' };
        
            if(subject) {
            const subjectTeachers = await User.find({ ...teacherQuery, subject: subject });
            
            if(subjectTeachers.length === 0) {
                const allTeachers = await User.find(teacherQuery);
                if(!date || !slot){
                    return res.json(allTeachers);
                }
                const lectures = await Lectures.find({date: new Date(date), slot: slot});
                const busyTeachers = lectures.map(l => l.teacher);
                const freeTeachers = allTeachers.filter(t => !busyTeachers.includes(t.username));
                return res.json(freeTeachers);
            }
            
            if(!date || !slot){
                return res.json(subjectTeachers);
            }
            const lectures = await Lectures.find({date: new Date(date), slot: slot});
            const busyTeachers = lectures.map(l => l.teacher);
            const freeTeachers = subjectTeachers.filter(t => !busyTeachers.includes(t.username));
            return res.json(freeTeachers);
        }
        
        const teachers = await User.find(teacherQuery);
        if(!date || !slot){
            return res.json(teachers);
        }
        const lectures = await Lectures.find({date: new Date(date), slot: slot});
        const busyTeachers = lectures.map(l => l.teacher);
        const freeTeachers = teachers.filter(t => !busyTeachers.includes(t.username));
        res.json(freeTeachers);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

async function getRejectedAdjustments(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const adjustments = await Adjustment.find({ 
            status: 'rejected',
            teacherResponse: 'rejected'
        }).populate('LeaveRequestId');
        
        const rejectedAdjustments = adjustments.map(adj => ({
            _id: adj._id,
            teacher: adj.teacher,
            subject: adj.subject,
            slot: adj.slot,
            room: adj.room,
            date: adj.date,
            substituteTeacher: adj.substituteTeacher,
            responseReason: adj.responseReason,
            respondedAt: adj.respondedAt,
            leaveRequest: adj.LeaveRequestId
        }));
        
        res.json(rejectedAdjustments);
    } catch (err) {
        console.error('Error getting rejected adjustments:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function reassignAdjustment(req, res) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { adjustmentId, newSubstituteTeacher, notes } = req.body;
    
    try {
        const adjustment = await Adjustment.findById(adjustmentId);
        if (!adjustment) {
            return res.status(404).json({ error: 'Adjustment not found' });
        }
        
        if (adjustment.status !== 'rejected') {
            return res.status(400).json({ error: 'Adjustment is not rejected' });
        }
        
        // Create new notification for the new substitute teacher
        const notification = await Notification.create({
            recipient: newSubstituteTeacher,
            sender: req.user.username,
            type: 'substitute_request',
            title: 'Substitute Teaching Request (Reassignment)',
            message: `You have been requested to substitute for ${adjustment.teacher} in ${adjustment.subject} on ${new Date(adjustment.date).toLocaleDateString()} at ${adjustment.slot} in room ${adjustment.room}. This is a reassignment from a previous rejection.`,
            adjustmentId: adjustmentId
        });
        
        // Update adjustment
        adjustment.substituteTeacher = newSubstituteTeacher;
        adjustment.notes = notes || adjustment.notes;
        adjustment.status = 'pending_approval';
        adjustment.teacherResponse = 'pending';
        adjustment.responseReason = null;
        adjustment.respondedAt = null;
        adjustment.assignedAt = new Date();
        
        await adjustment.save();
        
        res.json({ 
            success: true, 
            message: 'Adjustment reassigned successfully',
            notificationId: notification._id
        });
    } catch (err) {
        console.error('Error reassigning adjustment:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function respondToAdjustment(req, res) {
    const { adjustmentId, response, reason } = req.body;
    
    if (!adjustmentId || !response || !['accepted', 'rejected'].includes(response)) {
        return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    try {
        const adjustment = await Adjustment.findById(adjustmentId);
        if (!adjustment) {
            return res.status(404).json({ error: 'Adjustment not found' });
        }
        
        if (adjustment.substituteTeacher !== req.user.username) {
            return res.status(403).json({ error: 'Not authorized to respond to this adjustment' });
        }
        
        if (adjustment.status !== 'pending_approval') {
            return res.status(400).json({ error: 'Adjustment is not pending approval' });
        }
        
        // Update adjustment
        adjustment.teacherResponse = response;
        adjustment.responseReason = reason || null;
        adjustment.respondedAt = new Date();
        
        if (response === 'accepted') {
            adjustment.status = 'accepted';
        } else if (response === 'rejected') {
            adjustment.status = 'rejected';
        }
        
        await adjustment.save();
        
        // Create notification for admin
        await Notification.create({
            recipient: 'admin',
            sender: req.user.username,
            type: 'adjustment_response',
            title: `Adjustment ${response} by ${req.user.username}`,
            message: `${req.user.username} has ${response} the substitute request for ${adjustment.subject} on ${new Date(adjustment.date).toLocaleDateString()} at ${adjustment.slot}.${reason ? ` Reason: ${reason}` : ''}`,
            adjustmentId: adjustmentId
        });
        
        res.json({ 
            success: true, 
            message: `Adjustment ${response} successfully` 
        });
    } catch (err) {
        console.error('Error responding to adjustment:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
module.exports = {
    submitLeaveRequest,
    getMyLeaveRequests,
    getAllLeaveRequests,
    updateLeaveRequestStatus,
    getPendingAdjustments,
    assignSubstituteTeacher,
    resolveAdjustment,
    getAvailableTeachers,
    getRejectedAdjustments,
    reassignAdjustment,
    respondToAdjustment
}; 