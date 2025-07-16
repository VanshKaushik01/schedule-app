// routes/lectures.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authenticateJWT } = require('./auth');

const LECTURES_FILE = path.join(__dirname, '../lectures.json');

// Helper functions
function readData(file) {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// All routes below require authentication
router.use(authenticateJWT);

// Get lectures (optionally filter by teacher)
router.get('/', (req, res) => {
    const { teacher } = req.query;
    let lectures = readData(LECTURES_FILE);
    if (teacher) {
        lectures = lectures.filter(l => l.teacher === teacher);
    }
    res.json(lectures);
});

// Add lecture
router.post('/', (req, res) => {
    const { subject, room, day, date, slot, teacher } = req.body;
    if (!subject || !room || !day || !date || !slot || !teacher) {
        return res.status(400).json({ error: 'All fields required' });
    }
    let lectures = readData(LECTURES_FILE);
    // Prevent overlap
    if (lectures.some(l => l.day === day && l.date === date && l.slot === slot && l.teacher === teacher)) {
        return res.status(409).json({ error: 'Lecture already scheduled for this slot/teacher' });
    }
    const id = Date.now();
    const newLecture = { id, subject, room, day, date, slot, teacher, completed: false };
    lectures.push(newLecture);
    writeData(LECTURES_FILE, lectures);
    res.json(newLecture);
});

// Mark lecture as completed
router.post('/:id/complete', (req, res) => {
    const id = parseInt(req.params.id);
    let lectures = readData(LECTURES_FILE);
    const idx = lectures.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Lecture not found' });
    lectures[idx].completed = true;
    writeData(LECTURES_FILE, lectures);
    res.json({ success: true });
});

// Delete lecture
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let lectures = readData(LECTURES_FILE);
    const initialLength = lectures.length;
    lectures = lectures.filter(l => l.id !== id);
    if (lectures.length === initialLength) {
        return res.status(404).json({ error: 'Lecture not found' });
    }
    writeData(LECTURES_FILE, lectures);
    res.json({ success: true });
});

// Get lecture counts for a teacher
router.get('/counts/:teacher', (req, res) => {
    const teacher = req.params.teacher;
    const lectures = readData(LECTURES_FILE).filter(l => l.teacher === teacher);
    const total = lectures.length;
    const completed = lectures.filter(l => l.completed).length;
    const left = total - completed;
    res.json({ total, completed, left });
});

module.exports = router;
