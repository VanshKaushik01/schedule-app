const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
    },
    room: {
        type: String,
        required: true,
    },
    day: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    slot: {
        type: String,
        required: true,
    },
    teacher: {
        type: String,
        required: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    isSubstitute:{
        type: Boolean,
        default: false,
    },
    originalTeacher:{
        type: String,
        default: null,
    }
});

const Lecture = mongoose.model('Lecture', lectureSchema);
module.exports = Lecture;