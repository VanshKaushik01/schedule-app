const Lectures = require('../models/lectures');
const User = require('../models/users');

async function findLectures(req, res) {
    try {
        const { teacher } = req.query;
        
        // const now = new Date();
        // const startOfWeek = new Date(now);
        // startOfWeek.setDate(now.getDate() - now.getDay() + 1); 
        // startOfWeek.setHours(0, 0, 0, 0);
        
        // const endOfWeek = new Date(startOfWeek);
        // endOfWeek.setDate(startOfWeek.getDate() + 6); 
        // endOfWeek.setHours(23, 59, 59, 999);
        
       
        // await autoCompletePastLectures();
        
        // let query = {
        //     date: {
        //         $gte: startOfWeek,
        //         $lte: endOfWeek
        //     }
        // };
        
        // if (teacher) {
            // query.teacher = teacher;
        // }
        
        const lectures = await Lectures.find({});
        res.json(lectures);
    } catch (err) {
        console.error('Get lectures error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function insertLecture(req, res) {
    const { subject, room, day, date, slot, teacher } = req.body;
    if (!subject || !room || !day || !date || !slot || !teacher) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    try {
        const teacherData = await User.findOne({ 
            username: teacher, 
            role: 'teacher' 
        });
        
        if (!teacherData) {
            return res.status(400).json({ error: 'Teacher not found' });
        }
        
        if (teacherData.subject !== subject) {
            return res.status(400).json({ 
                error: `${teacher} does not teach ${subject}. Please select a teacher who teaches this subject.` 
            });
        }
        
        const conflict = await Lectures.findOne({ 
            room: room, 
            day: day, 
            slot: slot 
        });
        
        if (conflict) {
            return res.status(409).json({ error: 'Lecture already scheduled in this room, day, and slot' });
        }
        
        const newLecture = new Lectures({
            subject,
            room,
            day,
            date: new Date(date),
            slot,
            teacher: teacher,
            completed: false
        });
        
        await newLecture.save();
        res.json({ success: true, ...newLecture.toObject() });
    } catch (err) {
        console.error('Create lecture error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function checkforLectureComplete(req, res) {
    try {
        const lecture = await Lectures.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ error: 'Lecture not found' });
        }
        lecture.completed = true;
        await lecture.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Complete lecture error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}



async function lectureCount(req, res) {
    try {
        const teacher = req.params.teacher;
        const lectures = await Lectures.find({ teacher: teacher });
        const total = lectures.length;
        const completed = lectures.filter(l => l.completed).length;
        const left = total - completed;
        res.json({ total, completed, left });
    } catch (err) {
        console.error('Get lecture counts error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function teacherlectureondate(req, res) {
    const { teacher, date } = req.query;
    if (!teacher || !date) {
        return res.status(400).json({ error: 'Teacher and date are required' });
    }
    
    try {
        await autoCompletePastLectures();
        
        const lectures = await Lectures.find({ 
            teacher: teacher, 
            date: new Date(date)
        });
        res.json(lectures);
    } catch (err) {
        console.error('Get lectures by date error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

// async function autoCompletePastLectures() {
//     try {
//         const now = new Date();
//         const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
//         const pastLectures = await Lectures.find({
//             date: { $lt: today },
//             completed: false
//         });
        
//         if (pastLectures.length > 0) {
//             await Lectures.updateMany(
//                 { _id: { $in: pastLectures.map(l => l._id) } },
//                 { completed: true }
//             );
//             console.log(`Auto-completed ${pastLectures.length} past lectures`);
//         }
//     } catch (err) {
//         console.error('Auto-complete past lectures error:', err);
//     }
// }

async function getTeachersBySubject(req, res) {
    const { subject } = req.query;
    
    if (!subject) {
        return res.status(400).json({ error: 'Subject is required' });
    }
    
    try {
        const teachers = await User.find({ 
            role: 'teacher', 
            subject: subject 
        });
        
        if (teachers.length === 0) {
            const allTeachers = await User.find({ role: 'teacher' });
            return res.json({
                teachers: allTeachers,
                message: `No teachers found for ${subject}. Showing all available teachers.`
            });
        }
        
        res.json({
            teachers: teachers,
            message: `Found ${teachers.length} teachers for ${subject}`
        });
    } catch (err) {
        console.error('Get teachers by subject error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

// async function refreshLectures(req, res) {
//     try {
//         await autoCompletePastLectures();
//         res.json({ 
//             success: true, 
//             message: 'Lectures refreshed successfully' 
//         });
//     } catch (err) {
//         console.error('Refresh lectures error:', err);
//         res.status(500).json({ error: 'Server error' });
//     }
// }

module.exports = {
    findLectures,
    insertLecture,
    checkforLectureComplete,
    // deleteLecture,
    lectureCount,
    teacherlectureondate,
    getTeachersBySubject,
    // refreshLectures
};