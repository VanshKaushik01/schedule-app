const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    profileImage: {
        type: String,
        default: 'https://example.com/default-profile-image.png',
    },
    role: {
        type: String,
        enum: ['admin','teacher'],
        required: true,
    }
});

const User = mongoose.model('user', userSchema);
module.exports = User;