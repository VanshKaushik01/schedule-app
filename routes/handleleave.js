const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const { authenticateJWT } = require('./auth');

const ADJUSTMENTS_FILE = path.join(__dirname, '../adjustmentfile.json');
const LECTURES_FILE = path.join(__dirname, '../lectures.json');
const USERS_FILE = path.join(__dirname, '../users.json');
const LEAVE_REQUESTS_FILE = path.join(__dirname, '../leave-requests.json');

async function readAdjustments() {
    try {
        const data = await fs.readFile(ADJUSTMENTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

async function writeAdjustments(data) {
    await fs.writeFile(ADJUSTMENTS_FILE, JSON.stringify(data, null, 2));
}

async function readLeaveRequests() {
    try {
        const data = await fs.readFile(LEAVE_REQUESTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

async function writeLeaveRequests(data) {
    await fs.writeFile(LEAVE_REQUESTS_FILE, JSON.stringify(data, null, 2));
}

router.post('/leave-request', authenticateJWT, async (req, res) => {
    const { leaveDate, leaveReason, teacher } = req.body;
    if (!leaveDate || !leaveReason) {
        return res.status(400).json({ error: 'Date and reason are required' });
    }
    try {
        const leaveRequests = await readLeaveRequests();
        const leaveId = `leave_${Date.now()}`;
        leaveRequests[leaveId] = {
            id: leaveId,
            teacher: teacher || req.user.username,
            date: leaveDate,
            reason: leaveReason,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        await writeLeaveRequests(leaveRequests);

        let lecturesObj = {};
        try {
            const data = await fs.readFile(LECTURES_FILE, 'utf-8');
            lecturesObj = JSON.parse(data);
        } catch (err) {}
        const lectures = Object.values(lecturesObj).filter(l => 
            l.teacher === (teacher || req.user.username) && l.date === leaveDate
        );

        let adjustments = await readAdjustments();
        lectures.forEach(lecture => {
            const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            adjustments[adjustmentId] = {
                id: adjustmentId,
                teacherName: teacher || req.user.username,
                subject: lecture.subject,
                timeSlot: lecture.slot,
                room: lecture.room,
                date: leaveDate,
                leaveReason: leaveReason,
                status: 'pending',
                substituteTeacher: null,
                notes: null,
                leaveRequestId: leaveId,
                lectureId: lecture.id
            };
        });
        await writeAdjustments(adjustments);

        res.json({ 
            success: true, 
            message: `Leave request submitted. ${lectures.length} adjustments created.`,
            adjustmentsCreated: lectures.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/my-leave-requests', authenticateJWT, async (req, res) => {
    try {
        const leaveRequests = await readLeaveRequests();
        const teacherRequests = Object.values(leaveRequests).filter(lr => lr && lr.teacher && req.user && lr.teacher === req.user.username);
        
        const adjustments = await readAdjustments();
        const requestsWithAdjustments = teacherRequests.map(request => {
            const requestAdjustments = Object.values(adjustments).filter(adj => 
                adj && adj.leaveRequestId === request.id
            );
            return {
                ...request,
                adjustments: requestAdjustments
            };
        });
        res.json(requestsWithAdjustments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/leave-request', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const leaveRequests = await readLeaveRequests();
        res.json(Object.values(leaveRequests));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/leave-request/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        const leaveRequests = await readLeaveRequests();
        if (!leaveRequests[req.params.id]) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        leaveRequests[req.params.id].status = status;
        await writeLeaveRequests(leaveRequests);

        Object.values(adjustments).forEach(adj => {
            if (adj.leaveRequestId === req.params.id) {
                adj.status = status === 'approved' ? 'pending' : 'cancelled';
            }
        });
        await writeAdjustments(adjustments);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/adjustments', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const adjustments = await readAdjustments();
        const pendingAdjustments = Object.values(adjustments).filter(adj => 
            adj.status === 'pending'
        );
        res.json(pendingAdjustments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

    router.post('/adjustments/assign-substitute', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { adjustmentId, substituteTeacher, adjustmentNotes } = req.body;
    if (!adjustmentId || !substituteTeacher) {
        return res.status(400).json({ error: 'Adjustment ID and substitute teacher are required' });
    }
    try {
        const adjustments = await readAdjustments();
        if (!adjustments[adjustmentId]) {
            return res.status(404).json({ error: 'Adjustment not found' });
        }
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
        const originalTeacher = adjustments[adjustmentId].teacherName;
        const subject = adjustments[adjustmentId].subject;
        const eligibleTeachers = Object.values(users).filter(u => u.role === 'teacher' && u.subject === subject && u.username !== originalTeacher);
        if (!eligibleTeachers.some(t => t.username === substituteTeacher)) {
            return res.status(400).json({ error: 'Selected substitute is not eligible for this subject' });
        }
        adjustments[adjustmentId].substituteTeacher = substituteTeacher;
        adjustments[adjustmentId].notes = adjustmentNotes;
        adjustments[adjustmentId].status = 'assigned';
        adjustments[adjustmentId].assignedAt = new Date().toISOString();
        await writeAdjustments(adjustments);

        const lecturesObj = await (async () => {
            try {
                const data = await fs.readFile(LECTURES_FILE, 'utf-8');
                return JSON.parse(data);
            } catch (err) { return {}; }
        })();
        const newLectureId = Date.now();
        lecturesObj[newLectureId] = {
            id: newLectureId,
            subject: adjustments[adjustmentId].subject,
            room: adjustments[adjustmentId].room,
            day: adjustments[adjustmentId].day || '',
            date: adjustments[adjustmentId].date,
            slot: adjustments[adjustmentId].timeSlot,
            teacher: substituteTeacher,
            completed: false,
            isSubstitute: true,
            originalTeacher: originalTeacher
        };
        await fs.writeFile(LECTURES_FILE, JSON.stringify(lecturesObj, null, 2));

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

    router.patch('/adjustments/:id/resolve', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const adjustments = await readAdjustments();
        if (!adjustments[req.params.id]) {
            return res.status(404).json({ error: 'Adjustment not found' });
        }
        adjustments[req.params.id].status = 'resolved';
        adjustments[req.params.id].resolvedAt = new Date().toISOString();
        await writeAdjustments(adjustments);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/teachers', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        const users = JSON.parse(data);
        const teachers = Object.values(users).filter(user => user.role === 'teacher');
        res.json(teachers);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
