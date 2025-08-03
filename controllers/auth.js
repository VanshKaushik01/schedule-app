const jwt = require('jsonwebtoken');
const User = require('../models/users');
const SECRET = 'your_jwt_secret';

async function signup(req, res) {
    const { username, email, password, subject } = req.body;
    if (!username || !email || !password || !subject) {
        return res.status(400).json({ error: 'All fields required' });
    }
    try {
        const existingUser = await User.findOne({email: email});
        if (existingUser) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        let profileImage = null;
        if (req.file) {
            profileImage = `/uploads/${req.file.filename}`;
        }
        const role = 'teacher';
        const user = new User({
            username,
            email,
            password,
            role,
            subject,
            profileImage
        });
        await user.save();
        const token = jwt.sign({ username, role, subject, profileImage }, SECRET, { expiresIn: '12h' });
        res.cookie('token', token, { httpOnly: true });
        res.json({ username, role, subject, profileImage, token });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function login(req, res) {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });  
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ 
            username: user.username, 
            role: user.role, 
            profileImage: user.profileImage 
        }, SECRET, { expiresIn: '1d' });
        res.cookie('token', token, { httpOnly: true });
        res.json({ 
            username: user.username, 
            role: user.role, 
            profileImage: user.profileImage, 
            token 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getTeachers(req, res) {
    try {
        const { subject } = req.query;
        let query = { role: 'teacher' };
        if (subject) {
            query.subject = subject;
        }
        const teachers = await User.find(query).select('username email subject');
        res.json(teachers);
    } catch (err) {
        console.error('Get teachers error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getMe(req, res) {
    try {
        const user = await User.findOne({ username: req.user.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('Get me error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function logout(req, res) {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
}

module.exports = {
    signup,
    login,
    getTeachers,
    getMe,
    logout
};
