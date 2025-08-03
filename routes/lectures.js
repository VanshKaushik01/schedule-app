const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const {findLectures, insertLecture, checkforLectureComplete, lectureCount, teacherlectureondate, getTeachersBySubject} = require('../controllers/lectures');

router.use(authenticateJWT);

router.get('/', findLectures);
router.post('/', insertLecture);
router.post('/:id/complete', checkforLectureComplete);
// router.delete('/:id', deleteLecture);
router.get('/counts/:teacher', lectureCount);
router.get('/by-date', teacherlectureondate);
router.get('/teachers-by-subject', getTeachersBySubject);
// router.post('/refresh', refreshLectures);

module.exports = router;
