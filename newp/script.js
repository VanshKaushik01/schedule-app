let currentUser = null;
let lectures = [];

document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    loadLectures();
    
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'index.html' || currentPage === '') {
        initializeLoginPage();
    } else if (currentPage === 'signup.html') {
        initializeSignupPage();
    } else if (currentPage === 'admin.html') {
        initializeAdminPage();
    } else if (currentPage === 'teacher.html') {
        initializeTeacherPage();
    }
});

function loadUserData() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        currentUser = JSON.parse(userData);
    }
}

function loadLectures() {
    const savedLectures = localStorage.getItem('lectures');
    if (savedLectures) {
        lectures = JSON.parse(savedLectures);
    }
}

function saveLectures() {
    localStorage.setItem('lectures', JSON.stringify(lectures));
}

function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

function initializeSignupPage() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

// Handle login 
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        alert('Invalid username or password');
        return;
    }
    
    currentUser = { username: user.username, role: user.role };
    localStorage.setItem('userData', JSON.stringify(currentUser));
    
    if (user.role === 'admin') {
        window.location.href = 'admin.html';
    } else if (user.role === 'teacher') {
        window.location.href = 'teacher.html';
    }
}

// Handle signup
function handleSignup(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    
    if (!username || !email || !password || !role) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const userExists = existingUsers.some(user => user.username === username || user.email === email);
    
    if (userExists) {
        alert('Username or email already exists');
        return;
    }
    
    const newUser = {
        username,
        email,
        password,
        role
    };
    
    existingUsers.push(newUser);
    localStorage.setItem('users', JSON.stringify(existingUsers));
    
    currentUser = { username, role };
    localStorage.setItem('userData', JSON.stringify(currentUser));
    
    alert('Account created successfully!');
    
    if (role === 'admin') {
        window.location.href = 'admin.html';
    } else if (role === 'teacher') {
        window.location.href = 'teacher.html';
    }
}

function initializeAdminPage() {
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = `Welcome, ${currentUser.username} (Admin)`;
    }
    
    const lectureForm = document.getElementById('lectureForm');
    if (lectureForm) {
        lectureForm.addEventListener('submit', handleLectureForm);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    renderTimetable();
    renderCalendar();
}

// Handle lecture
function handleLectureForm(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const lecture = {
        subject: formData.get('subject'),
        room: formData.get('room'),
        day: formData.get('day'),
        date: formData.get('date'),
        slot: formData.get('slot'),
        id: Date.now() 
    };
    
    // Check for overlapping entries
    if (isOverlapping(lecture)) {
        alert('There is already a lecture scheduled for this time slot on this day.');
        return;
    }
    
    lectures.push(lecture);
    saveLectures();
    
    event.target.reset();
    
    renderTimetable();    
    renderCalendar();
    alert('Lecture added successfully!');
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // Remove any existing calendar instance
    calendarEl.innerHTML = '';

    // Map lectures to FullCalendar events with subject color
    const events = lectures.map(lecture => ({
        title: `${lecture.subject} (${lecture.room})`,
        start: lecture.date,
        allDay: true,
        backgroundColor: getSubjectColor(lecture.subject),
        borderColor: getSubjectColor(lecture.subject),
        extendedProps: {
            day: lecture.day,
            slot: lecture.slot
        }
    }));

    // Initialize FullCalendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridWeek',
        events: events,
        eventClick: function(info) {
            alert(
                `Subject: ${info.event.title}\n` +
                `Day: ${info.event.extendedProps.day}\n` +
                `Slot: ${info.event.extendedProps.slot}`
            );
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        eventDidMount: function(info) {
            // Set background color for subject
            info.el.style.backgroundColor = getSubjectColor(info.event.title.split(' ')[0]);
        }
    });

    calendar.render();
}

// Check for overlapping lectures
function isOverlapping(newLecture) {
    return lectures.some(lecture => 
        lecture.day === newLecture.day && 
        lecture.slot === newLecture.slot &&
        lecture.date === newLecture.date
    );
}

// Render timetable table
function renderTimetable() {
    const tableBody = document.getElementById('lectureTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    lectures.forEach(lecture => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lecture.subject}</td>
            <td>${lecture.room}</td>
            <td>${lecture.day}</td>
            <td>${formatDate(lecture.date)}</td>
            <td>${lecture.slot}</td>
            <td>
                <button class="btn-delete" onclick="deleteLecture(${lecture.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Delete lecture
function deleteLecture(id) {
    if (confirm('Are you sure you want to delete this lecture?')) {
        lectures = lectures.filter(lecture => lecture.id !== id);
        saveLectures();
        renderTimetable();
        renderCalendar();
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getSubjectColor(subject) {
    const subjectColors = {
        'Physics': '#e74c3c',
        'Mathematics': '#3498db',
        'Chemistry': '#f39c12',
        'Biology': '#27ae60',
        'English': '#9b59b6',
        'History': '#e67e22',
        'Geography': '#1abc9c',
        'Computer Science': '#34495e'
    };
    
    return subjectColors[subject] || '#667eea';
} 

function handleLogout() {
    localStorage.removeItem('userData');
    currentUser = null;
    
    window.location.href = 'index.html';
}

function initializeTeacherPage() {
    if (!currentUser || currentUser.role !== 'teacher') {
        window.location.href = 'index.html';
        return;
    }
    const teacherDisplay = document.getElementById('teacherDisplay');
    if (teacherDisplay) {
        teacherDisplay.textContent = `Welcome, ${currentUser.username} (Teacher)`;
    }
    const teacherName = document.getElementById('teacherName');
    if (teacherName) {
        teacherName.textContent = currentUser.username;
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}
