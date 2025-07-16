const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Use modular routes
const { router: authRouter } = require('./routes/auth');
const lecturesRouter = require('./routes/lectures');

app.use('/api', authRouter);        
app.use('/api/lectures', lecturesRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});