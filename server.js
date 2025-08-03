const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;

mongoose.connect('mongodb://localhost:27017/attendance')
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.log('Error connecting to MongoDB:', error);
  });

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));
app.use(express.static(path.join(__dirname, 'public')));

const authRouter = require('./routes/auth');
const lecturesRouter = require('./routes/lectures');
const handleLeaveRouter = require('./routes/handleleave');
const notificationsRouter = require('./routes/notifications');


app.use('/api', authRouter);        
app.use('/api/lectures', lecturesRouter);
app.use('/api', handleLeaveRouter);
app.use('/api', notificationsRouter);

app.get('/', (req, res) => res.render('index'));
app.get('/index.ejs', (req, res) => res.render('index'));
app.get('/signup.ejs', (req, res) => res.render('signup'));
app.get('/admin.ejs', (req, res) => res.render('admin'));
app.get('/teacher.ejs', (req, res) => res.render('teacher'));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

