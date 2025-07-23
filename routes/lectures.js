const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authenticateJWT } = require('./auth');

const lecture_file = path.join(__dirname, '../lectures.json');

function readData(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

router.use(authenticateJWT);

// Get lectures (optionally filter by teacher)
router.get('/', (req, res) => {
    const { teacher } = req.query;
    const lecturesObj = readData(lecture_file);
    let lectures = Object.values(lecturesObj);
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
    let lecturesObj = readData(lecture_file);
    // Prevent overlap: no two lectures in same room, day, slot
    const conflict = Object.values(lecturesObj).some(l => l.room === room && l.day === day && l.slot === slot);
    if (conflict) {
        return res.status(409).json({ error: 'Lecture already scheduled in this room, day, and slot' });
    }
    const id = Date.now();
    const newLecture = { id, subject, room, day, date, slot, teacher, completed: false };
    lecturesObj[id] = newLecture;
    writeData(lecture_file, lecturesObj);
    res.json(newLecture);
});

// Mark lecture as completed
router.post('/:id/complete', (req, res) => {
    const id = req.params.id;
    let lecturesObj = readData(lecture_file);
    if (!lecturesObj[id]) return res.status(404).json({ error: 'Lecture not found' });
    lecturesObj[id].completed = true;
    writeData(lecture_file, lecturesObj);
    res.json({ success: true });
});

// Delete lecture
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    let lecturesObj = readData(lecture_file);
    if (!lecturesObj[id]) {
        return res.status(404).json({ error: 'Lecture not found' });
    }
    delete lecturesObj[id];
    writeData(lecture_file, lecturesObj);
    res.json({ success: true });
});

// Get lecture counts for a teacher
router.get('/counts/:teacher', (req, res) => {
    const teacher = req.params.teacher;
    const lectures = Object.values(readData(lecture_file)).filter(l => l.teacher === teacher);
    const total = lectures.length;
    const completed = lectures.filter(l => l.completed).length;
    const left = total - completed;
    res.json({ total, completed, left });
});

// Get lectures for a given teacher and date (for adjustment system)
router.get('/by-date', (req, res) => {
    const { teacher, date } = req.query;
    if (!teacher || !date) {
        return res.status(400).json({ error: 'Teacher and date are required' });
    }
    const lecturesObj = readData(lecture_file);
    const lectures = Object.values(lecturesObj).filter(l => l.teacher === teacher && l.date === date);
    res.json(lectures);
});

module.exports = router;
