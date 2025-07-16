// routes/auth.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const SECRET = 'your_jwt_secret'; // Use env var in production

const USERS_FILE = path.join(__dirname, '../users.json');

// Helper functions
function readData(file) {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// JWT middleware
function authenticateJWT(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Signup
router.post('/signup', (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields required' });
    }
    const users = readData(USERS_FILE);
    if (users.some(u => u.username === username || u.email === email)) {
        return res.status(409).json({ error: 'Username or email already exists' });
    }
    users.push({ username, email, password, role });
    writeData(USERS_FILE, users);
    // Generate JWT
    const token = jwt.sign({ username, role }, SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ username, role });
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readData(USERS_FILE);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    // Generate JWT
    const token = jwt.sign({ username: user.username, role: user.role }, SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ username: user.username, role: user.role });
});

// Get all teachers (protected)
router.get('/teachers', authenticateJWT, (req, res) => {
    const users = readData(USERS_FILE);
    const teachers = users.filter(u => u.role === 'teacher').map(u => ({
        username: u.username,
        email: u.email
    }));
    res.json(teachers);
});

// Get current user info from JWT
router.get('/me', authenticateJWT, (req, res) => {
    res.json({ username: req.user.username, role: req.user.role });
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

module.exports = { router, authenticateJWT };
