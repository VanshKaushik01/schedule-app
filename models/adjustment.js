const mongoose = require('mongoose');
const LeaveRequest = require('./leaveRequest');

const adjustmentSchema = new mongoose.Schema({
    teacher:  {
         type: String, 
         required: true 
        },
    date: { 
        type: Date, 
        required: true
     },
    slot: { 
        type: String,
         required: true 
        },
    subject: { 
        type: String, 
        required: true 
    },
    room: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'assigned', 'pending_approval', 'accepted', 'rejected', 'resolved', 'cancelled'], 
        default: 'pending' 
    },
    LeaveRequestId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LeaveRequest',
        required: true
    },
    substituteTeacher: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    assignedAt: {
        type: Date,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    teacherResponse: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    responseReason: {
        type: String,
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
    }
}
,{timestamps: true});

const Adjustment = mongoose.model('Adjustment', adjustmentSchema);
module.exports = Adjustment; 