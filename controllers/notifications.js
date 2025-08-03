const Notification = require('../models/notification');
const Adjustment = require('../models/adjustment');
const LeaveRequest = require('../models/leaveRequest');

async function getNotifications(req, res) {
    try {
        const notifications = await Notification.find({ 
            recipient: req.user.username 
        }).sort({ createdAt: -1 });
        
        res.json(notifications);
    } catch (err) {
        console.error('Error getting notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function respondToNotification(req, res) {
    const { notificationId, response, reason } = req.body;
    
    if (!notificationId || !response || !['accepted', 'rejected'].includes(response)) {
        return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        if (notification.recipient !== req.user.username) {
            return res.status(403).json({ error: 'Not authorized to respond to this notification' });
        }
        
        if (notification.status !== 'pending') {
            return res.status(400).json({ error: 'Notification has already been responded to' });
        }
        
        // Update notification
        notification.status = response;
        notification.responseReason = reason || null;
        notification.respondedAt = new Date();
        await notification.save();
        
        // Update adjustment if this is a substitute request
        if (notification.type === 'substitute_request' && notification.adjustmentId) {
            const adjustment = await Adjustment.findById(notification.adjustmentId);
            if (adjustment) {
                adjustment.teacherResponse = response;
                adjustment.responseReason = reason || null;
                adjustment.respondedAt = new Date();
                
                if (response === 'accepted') {
                    adjustment.status = 'accepted';
                } else if (response === 'rejected') {
                    adjustment.status = 'rejected';
                }
                
                await adjustment.save();
            }
        }
        
        res.json({ 
            success: true, 
            message: `Request ${response} successfully` 
        });
    } catch (err) {
        console.error('Error responding to notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function createNotification(notificationData) {
    try {
        const notification = await Notification.create(notificationData);
        return notification;
    } catch (err) {
        console.error('Error creating notification:', err);
        throw err;
    }
}

module.exports = {
    getNotifications,
    respondToNotification,
    createNotification
}; 