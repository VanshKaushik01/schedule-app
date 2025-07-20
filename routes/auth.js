// routes/auth.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
// const jwt = require('jsonwebtoken');
const SECRET = 'your_jwt_secret'; // Use env var in production
const multer = require('multer');
const upload = multer({
    dest: path.join(__dirname, '../public/uploads'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'));
        }
        cb(null, true);
    }
});
// const cookieParser = require('cookie-parser');

const USERS_FILE = path.join(__dirname, '../users.json');

// Helper functions
function readData(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// JWT middleware
// function authenticateJWT(req, res, next) {
//     const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
//     if (!token) return res.status(401).json({ error: 'Unauthorized' });
//     jwt.verify(token, SECRET, (err, user) => {
//         if (err) return res.status(403).json({ error: 'Invalid token' });
//         req.user = user;
//         next();
//     });
// }

function authenticateSession(req, res, next) {
    if (req.session && req.session.user) {
        req.user = req.session.user;
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}
// Signup with Multer for profile image
router.post('/signup', upload.single('profileImage'), (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields required' });
    }
    const users = readData(USERS_FILE);
    if (users[username] || Object.values(users).some(u => u.email === email)) {
        return res.status(409).json({ error: 'Username or email already exists' });
    }
    let profileImage = null;
    if (req.file) {
        profileImage = req.file.filename;
    }
    users[username] = { username, email, password, role, profileImage };
    writeData(USERS_FILE, users);
    // // Generate JWT
    // const token = jwt.sign({ username, role }, SECRET, { expiresIn: '1d' });
    // res.cookie('token', token, { httpOnly: true });
    // res.json({ username, role });
    req.session.user = { username, role };
    res.json({ username, role });
});
// Login (session-based)
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readData(USERS_FILE);
    const user = users[username] && users[username].password === password ? users[username] : null;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    // // Generate JWT
    // const token = jwt.sign({ username: user.username, role: user.role }, SECRET, { expiresIn: '1d' });
    // res.cookie('token', token, { httpOnly: true });
    // res.json({ username: user.username, role: user.role });
    req.session.user = { username: user.username, role: user.role };
    res.json({ username: user.username, role: user.role });
});

// Get all teachers (protected)
router.get('/teachers', authenticateSession, (req, res) => {
    const users = readData(USERS_FILE);
    const teachers = Object.values(users).filter(u => u.role === 'teacher').map(u => ({
        username: u.username,
        email: u.email
    }));
    res.json(teachers);
});

// Get current user info
router.get('/me', authenticateSession, (req, res) => {
    res.json({ username: req.user.username, role: req.user.role });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('token'); // For compatibility if JWT was used
        res.json({ message: 'Logged out successfully' });
    });
});

module.exports = { router, authenticateSession };
