const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authenticateJWT } = require('./auth');

const ADJUSTMENTS_FILE = path.join(__dirname, '../adjustments.json');
const LECTURES_FILE = path.join(__dirname, '../lectures.json');
const USERS_FILE = path.join(__dirname, '../users.json');

function readAdjustments() {
    if (!fs.existsSync(ADJUSTMENTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(ADJUSTMENTS_FILE, 'utf-8'));
}
function writeAdjustments(data) {
    fs.writeFileSync(ADJUSTMENTS_FILE, JSON.stringify(data, null, 2));
}

// Teacher submits leave request (creates adjustment requests for all lectures on that date)
router.post('/leave-request', authenticateJWT, (req, res) => {
    const { date, reason } = req.body;
    if (!date || !reason) {
        return res.status(400).json({ error: 'Date and reason are required' });
    }
    const lecturesObj = fs.existsSync(LECTURES_FILE) ? JSON.parse(fs.readFileSync(LECTURES_FILE, 'utf-8')) : {};
    const lectures = Object.values(lecturesObj).filter(l => l.teacher === req.user.username && l.date === date);
    if (!lectures.length) {
        return res.status(404).json({ error: 'No lectures scheduled for this date' });
    }
    let adjustments = readAdjustments();
    const now = Date.now();
    lectures.forEach(lecture => {
        const id = `${lecture.id}-${now}`;
        adjustments[id] = {
            id,
            teacher: req.user.username,
            lectureId: lecture.id,
            subject: lecture.subject,
            room: lecture.room,
            day: lecture.day,
            date: lecture.date,
            slot: lecture.slot,
            reason,
            status: 'pending',
            substitute: null
        };
    });
    writeAdjustments(adjustments);
    res.json({ success: true, created: lectures.length });
});

// Admin fetches all pending adjustment requests
router.get('/', authenticateJWT, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const adjustments = readAdjustments();
    const users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) : {};
    const lectures = fs.existsSync(LECTURES_FILE) ? JSON.parse(fs.readFileSync(LECTURES_FILE, 'utf-8')) : {};
    const pending = Object.values(adjustments).filter(a => a.status === 'pending');
    // Attach teacher name and lecture details
    const result = pending.map(a => {
        const teacher = users[a.teacher] || { username: a.teacher };
        const lecture = lectures[a.lectureId] || {};
        return {
            ...a,
            teacherName: teacher.username,
            lectureDetails: lecture
        };
    });
    res.json(result);
});

// Admin assigns a substitute teacher
router.post('/:id/assign', authenticateJWT, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { substitute } = req.body;
    if (!substitute) return res.status(400).json({ error: 'Substitute teacher required' });
    let adjustments = readAdjustments();
    if (!adjustments[req.params.id]) return res.status(404).json({ error: 'Adjustment not found' });
    adjustments[req.params.id].substitute = substitute;
    writeAdjustments(adjustments);
    res.json({ success: true });
});

// Admin marks adjustment as resolved
router.post('/:id/resolve', authenticateJWT, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    let adjustments = readAdjustments();
    if (!adjustments[req.params.id]) return res.status(404).json({ error: 'Adjustment not found' });
    adjustments[req.params.id].status = 'resolved';
    writeAdjustments(adjustments);
    res.json({ success: true });
});

module.exports = router;
 