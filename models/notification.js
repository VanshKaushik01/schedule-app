const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true
    },
    sender: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['substitute_request', 'adjustment_response', 'leave_request'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    adjustmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Adjustment',
        required: false
    },
    leaveRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LeaveRequest',
        required: false
    },
    responseReason: {
        type: String,
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification; 