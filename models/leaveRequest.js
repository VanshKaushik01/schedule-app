const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    teacher: {
         type: String, 
         required: true
         },
    date: { 
        type: Date,
         required: true 
        },
    reason: {
         type: String,
         required: true 
        },
    status: {
         type: String,
          enum: ['pending', 'approved', 'rejected'],
           default: 'pending' 
        }
},{
    timestamps: true});

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
module.exports = LeaveRequest; 