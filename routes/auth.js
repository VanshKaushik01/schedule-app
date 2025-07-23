const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SECRET = 'your_jwt_secret'; 
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'));
        }
        cb(null, true);
    }
});

const USERS_FILE = path.join(__dirname, '../users.json');

function readData(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


function authenticateJWT(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

router.post('/signup', upload.single('profileImage'), (req, res) => {
    const { username, email, password, subject } = req.body;
    if (!username || !email || !password || !subject) {
        return res.status(400).json({ error: 'All fields required' });
    }
    const users = readData(USERS_FILE);
    if (users[username] || Object.values(users).some(u => u.email === email)) {
        return res.status(409).json({ error: 'Username or email already exists' });
    }
    let profileImage = null;
    if (req.file) {
        profileImage = `/uploads/${req.file.filename}`;
    }
    const role = 'teacher';
    users[username] = { username, email, password, role, subject, profileImage };
    writeData(USERS_FILE, users);

    const token = jwt.sign({ username, role, subject, profileImage }, SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ username, role, subject, profileImage, token });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readData(USERS_FILE);
    const user = users[username] && users[username].password === password ? users[username] : null;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    // Generate JWT
    const token = jwt.sign({ username: user.username, role: user.role, profileImage: user.profileImage }, SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ username: user.username, role: user.role, profileImage: user.profileImage, token });
});

router.get('/teachers', authenticateJWT, (req, res) => {
    const users = readData(USERS_FILE);
    const { subject } = req.query;
    let teachers = Object.values(users).filter(u => u.role === 'teacher');
    if (subject) {
        teachers = teachers.filter(u => u.subject === subject);
    }
    teachers = teachers.map(u => ({
        username: u.username,
        email: u.email,
        subject: u.subject
    }));
    res.json(teachers);
});

router.get('/me', authenticateJWT, (req, res) => {
    const users = readData(USERS_FILE);
    const user = users[req.user.username];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, role: user.role, profileImage: user.profileImage });
});


router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

module.exports = { router, authenticateJWT };
