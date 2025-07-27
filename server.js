const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));
app.use(express.static(path.join(__dirname, 'public')));

const { router: authRouter, authenticateJWT, readAdjustments, writeAdjustments } = require('./routes/auth');
const lecturesRouter = require('./routes/lectures');
const handleLeaveRouter = require('./routes/handleleave');

app.use('/api', authRouter);        
app.use('/api/lectures', lecturesRouter);
app.use('/api', handleLeaveRouter);

app.get('/', (req, res) => res.render('index'));
app.get('/index.ejs', (req, res) => res.render('index'));
app.get('/signup.ejs', (req, res) => res.render('signup'));
app.get('/admin.ejs', (req, res) => res.render('admin'));
app.get('/teacher.ejs', (req, res) => res.render('teacher'));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});