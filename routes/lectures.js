const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const { authenticateJWT } = require('./auth');

const lecture_file = path.join(__dirname, '../lectures.json');

async function readData(file) {
    try {
        const data = await fs.readFile(file, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}
async function writeData(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

router.use(authenticateJWT);

router.get('/', async (req, res) => {
    const { teacher } = req.query;
    const lecturesObj = await readData(lecture_file);
    let lectures = Object.values(lecturesObj);
    if (teacher) {
        lectures = lectures.filter(l => l.teacher === teacher);
    }
    res.json(lectures);
});

router.post('/', async (req, res) => {
    const { subject, room, day, date, slot, teacher } = req.body;
    if (!subject || !room || !day || !date || !slot || !teacher) {
        return res.status(400).json({ error: 'All fields required' });
    }
    let lecturesObj = await readData(lecture_file);
    const conflict = Object.values(lecturesObj).some(l => l.room === room && l.day === day && l.slot === slot);
    if (conflict) {
        return res.status(409).json({ error: 'Lecture already scheduled in this room, day, and slot' });
    }
    const id = Date.now();
    const newLecture = { id, subject, room, day, date, slot, teacher, completed: false };
    lecturesObj[id] = newLecture;
    await writeData(lecture_file, lecturesObj);
    res.json({ success: true, ...newLecture });
});

router.post('/:id/complete', async (req, res) => {
    const id = req.params.id;
    let lecturesObj = await readData(lecture_file);
    if (!lecturesObj[id]) return res.status(404).json({ error: 'Lecture not found' });
    lecturesObj[id].completed = true;
    await writeData(lecture_file, lecturesObj);
    res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    let lecturesObj = await readData(lecture_file);
    if (!lecturesObj[id]) {
        return res.status(404).json({ error: 'Lecture not found' });
    }
    delete lecturesObj[id];
    await writeData(lecture_file, lecturesObj);
    res.json({ success: true });
});

router.get('/counts/:teacher', async (req, res) => {
    const teacher = req.params.teacher;
    const lectures = Object.values(await readData(lecture_file)).filter(l => l.teacher === teacher);
    const total = lectures.length;
    const completed = lectures.filter(l => l.completed).length;
    const left = total - completed;
    res.json({ total, completed, left });
});

router.get('/by-date', async (req, res) => {
    const { teacher, date } = req.query;
    if (!teacher || !date) {
        return res.status(400).json({ error: 'Teacher and date are required' });
    }
    const lecturesObj = await readData(lecture_file);
    const lectures = Object.values(lecturesObj).filter(l => l.teacher === teacher && l.date === date);
    res.json(lectures);
});

module.exports = router;
