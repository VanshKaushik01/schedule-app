async function api(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error((await res.json()).error || 'API error');
    return res.json();
}

let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'index.ejs' || currentPage === '') {
        initializeLoginPage();
    } else if (currentPage === 'signup.ejs') {
        initializeSignupPage();
    } else if (currentPage === 'admin.ejs') {
        await initializeAdminPage();
    } else if (currentPage === 'teacher.ejs') {
        await initializeTeacherPage();
    }
});

function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) {
        alert('Please fill in all fields');
        return;
    }
    try {
        const user = await api('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        currentUser = user;
        if (user.role === 'teacher') {
            window.location.href = 'teacher.ejs';
        } else if (user.role === 'admin') {
            window.location.href = 'admin.ejs';
        }
    } catch (err) {
        alert(err.message);
    }
}

function initializeSignupPage() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const password = formData.get('password');
    const subject = formData.get('subject');
    if (!formData.get('username') || !formData.get('email') || !password || !subject) {
        alert('Please fill in all fields');
        return;
    }
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    formData.delete('role'); 
    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        if (!res.ok) throw new Error((await res.json()).error || 'API error');
        const user = await res.json();
        currentUser = user;
        alert('Account created successfully!');
        window.location.href = 'teacher.ejs';
    } catch (err) {
        alert(err.message);
    }
}

async function initializeAdminPage() {
    try {
        const user = await api('/api/me', { credentials: 'include' });
        currentUser = user;
    } catch {
        window.location.href = 'index.ejs';
        return;
    }
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
    const subjectSelect = document.getElementById('subject');
    const teacherSelect = document.getElementById('teacher');
    if (subjectSelect && teacherSelect) {
        subjectSelect.addEventListener('change', async function() {
            const selectedSubject = subjectSelect.value;
            if (!selectedSubject) {
                teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
                return;
            }
            try {
                const teachers = await api(`/api/teachers?subject=${encodeURIComponent(selectedSubject)}`, { credentials: 'include' });
                teacherSelect.innerHTML = '<option value="">Select Teacher</option>' +
                    teachers.map(t => `<option value="${t.username}">${t.username}</option>`).join('');
            } catch (err) {
                teacherSelect.innerHTML = '<option value="">No teachers found</option>';
            }
        });
    }
    await populateTeacherDropdown();
    await renderTimetable();
    await renderCalendar();
}

async function populateTeacherDropdown() {
    const teacherSelect = document.getElementById('teacher');
    const subjectSelect = document.getElementById('subject');
    let subject = '';
    if (subjectSelect) subject = subjectSelect.value;
    try {
        let url = '/api/teachers';
        if (subject) url += `?subject=${encodeURIComponent(subject)}`;
        const teachers = await api(url, { credentials: 'include' });
        teacherSelect.innerHTML = '<option value="">Select Teacher</option>' +
            teachers.map(t => `<option value="${t.username}">${t.username}</option>`).join('');
    } catch (err) {
        teacherSelect.innerHTML = '<option value="">No teachers found</option>';
    }
}

async function handleLectureForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const lecture = {
        subject: formData.get('subject'),
        room: formData.get('room'),
        day: formData.get('day'),
        date: formData.get('date'),
        slot: formData.get('slot'),
        teacher: formData.get('teacher')
    };
    try {
        await api('/api/lectures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lecture),
            credentials: 'include'
        });
        event.target.reset();
        await renderTimetable();
        await renderCalendar();
        await renderLectureCounts();
        alert('Lecture added successfully!');
    } catch (err) {
        if (err.message && err.message.includes('Lecture already scheduled')) {
            alert('Error: There is already a lecture scheduled in this room, day, and slot!');
        } else {
            alert(err.message);
        }
        console.error('Error adding lecture:', err);
    }
}

async function renderTimetable() {
    const tableBody = document.getElementById('lectureTableBody');
    const tableHead = document.querySelector('#lectureTable thead');
    if (!tableBody || !tableHead) {
        console.error('Timetable tableBody or tableHead not found');
        return;
    }
    let lectures = [];
    try {
        const data = await api('/api/lectures', { credentials: 'include' });
        lectures = Array.isArray(data) ? data : Object.values(data);
        console.log('Fetched lectures for timetable:', lectures);
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="10">Failed to load lectures</td></tr>';
        console.error('Failed to fetch lectures:', err);
        return;
    }
    const slots = [
        '08:00-09:00',
        '09:00-10:00',
        '10:00-11:00',
        '11:00-12:00',
        '12:00-13:00',
        // '13:00-14:00',
        // '14:00-15:00',
        // '15:00-16:00',
        // '16:00-17:00'
    ];
    const weekdays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
    ];
    tableHead.innerHTML = `<tr><th>Day/Slot</th>${slots.map(slot => `<th>${slot}</th>`).join('')}</tr>`;
    tableBody.innerHTML = '';
    weekdays.forEach(day => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><b>${day}</b></td>`;
        slots?.forEach(slot => {
            const lecture = lectures.find(l => l.day === day && l.slot === slot);
            if (lecture) {
                let actions = `<button class='btn-delete' onclick='deleteLecture(${lecture.id})'>Delete</button>`;
                if (!lecture.completed) {
                    actions += ` <button class='btn-complete' onclick='markLectureCompleted(${lecture.id})'>Mark Completed</button>`;
                }
                row.innerHTML += `<td><div><b>${lecture.subject}</b><br>Room: ${lecture.room}<br>Teacher: ${lecture.teacher}<br>${lecture.completed ? '✔' : ''}<br>${actions}</div></td>`;
            } else {
                row.innerHTML += '<td></td>';
            }
        });
        tableBody.appendChild(row);
    });
}

async function deleteLecture(id) {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    try {
        await api(`/api/lectures/${id}`, { method: 'DELETE', credentials: 'include' });
        await renderTimetable();
        await renderCalendar();
        await renderLectureCounts();
        alert('Lecture deleted successfully!');
    } catch (err) {
        alert(err.message);
        console.error('Error deleting lecture:', err);
    }
}

async function markLectureCompleted(id) {
    try {
        await api(`/api/lectures/${id}/complete`, { method: 'POST', credentials: 'include' });
        await renderTimetable();
        await renderCalendar();
        await renderLectureCounts();
    } catch (err) {
        alert(err.message);
    }
}

async function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    calendarEl.innerHTML = '';
    let lectures = [];
    try {
        lectures = await api('/api/lectures', { credentials: 'include' });
    } catch (err) {
        return;
    }
    const events = lectures.map(lecture => ({
        title: `${lecture.subject} (${lecture.room}) - ${lecture.teacher} [${lecture.slot}]${lecture.completed ? ' ✔' : ''}`,
        start: lecture.date,
        allDay: true,
        backgroundColor: getSubjectColor(lecture.subject),
        borderColor: getSubjectColor(lecture.subject),
        extendedProps: {
            day: lecture.day,
            slot: lecture.slot,
            teacher: lecture.teacher,
            completed: lecture.completed
        }
    }));
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridWeek',
        events: events,
        slotMinTime: '08:00:00',
        slotMaxTime: '18:00:00',
        allDaySlot: false,
        slotDuration: '01:00:00',
        eventClick: function(info) {
            alert(
                `Subject: ${info.event.title}\n` +
                `Day: ${info.event.extendedProps.day}\n` +
                `Slot: ${info.event.extendedProps.slot}\n` +
                `Teacher: ${info.event.extendedProps.teacher}\n` +
                `Completed: ${info.event.extendedProps.completed ? 'Yes' : 'No'}`
            );
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        eventDidMount: function(info) {
            info.el.style.backgroundColor = getSubjectColor(info.event.title.split(' ')[0]);
        }
    });
    calendar.render();
}

async function renderLectureCounts() {
    if (!currentUser) return;
    try {
        const counts = await api(`/api/lectures/counts/${currentUser.username}`, { credentials: 'include' });
        const totalEl = document.getElementById('totalLectures');
        const doneEl = document.getElementById('lecturesDone');
        const leftEl = document.getElementById('lecturesLeft');
        if (totalEl) totalEl.textContent = counts.total;
        if (doneEl) doneEl.textContent = counts.completed;
        if (leftEl) leftEl.textContent = counts.left;
    } catch (err) {
        const totalEl = document.getElementById('totalLectures');
        const doneEl = document.getElementById('lecturesDone');
        const leftEl = document.getElementById('lecturesLeft');
        if (totalEl) totalEl.textContent = '-';
        if (doneEl) doneEl.textContent = '-';
        if (leftEl) leftEl.textContent = '-';
    }
}

async function initializeTeacherPage() {
    try {
        const user = await api('/api/me', { credentials: 'include' });
        currentUser = user;
    } catch {
        window.location.href = '/index.ejs';
        return;
    }
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
    
    const dashboardNav = document.getElementById('dashboardNav');
    const calendarNav = document.getElementById('calendarNav');
    
    if (dashboardNav && calendarNav) {
        dashboardNav.addEventListener('click', async function() {
            document.getElementById('dashboardPage').style.display = '';
            document.getElementById('calendarPage').style.display = 'none';
            setActiveSidebar('dashboardNav');
            await renderTeacherTimetable();
        });
        
        calendarNav.addEventListener('click', async function() {
            document.getElementById('dashboardPage').style.display = 'none';
            document.getElementById('calendarPage').style.display = '';
            setActiveSidebar('calendarNav');
            await renderTeacherCalendar();
        });
        
        setActiveSidebar('dashboardNav');
        document.getElementById('dashboardPage').style.display = '';
        document.getElementById('calendarPage').style.display = 'none';
    }
    
    await renderTeacherTimetable();
    await renderLectureCounts();
}

async function renderTeacherTimetable() {
    const tableBody = document.getElementById('lectureTableBody');
    if (!tableBody) {
        console.error('Teacher timetable tableBody not found');
        return;
    }
    let lectures = [];
    try {
        lectures = await api(`/api/lectures?teacher=${currentUser.username}`, { credentials: 'include' });
        console.log('Fetched lectures for teacher timetable:', lectures);
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="7">Failed to load lectures</td></tr>';
        console.error('Failed to fetch teacher lectures:', err);
        return;
    }
    tableBody.innerHTML = '';
    lectures.forEach(lecture => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lecture.subject}</td>
            <td>${lecture.room}</td>
            <td>${lecture.day}</td>
            <td>${lecture.date}</td>
            <td>${lecture.slot}</td>
            <td>${lecture.completed ? 'Yes' : 'No'}</td>
            <td>
                ${!lecture.completed ? `<button class="btn-complete" onclick="markLectureCompleted(${lecture.id})">Mark Completed</button>` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function renderTeacherCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    calendarEl.innerHTML = '';
    let lectures = [];
    try {
        lectures = await api(`/api/lectures?teacher=${currentUser.username}`, { credentials: 'include' });
    } catch (err) {
        return;
    }
    const events = lectures.map(lecture => ({
        title: `${lecture.subject} (${lecture.room}) [${lecture.slot}]${lecture.completed ? ' ✔' : ''}`,
        start: lecture.date,
        allDay: true,
        backgroundColor: getSubjectColor(lecture.subject),
        borderColor: getSubjectColor(lecture.subject),
        extendedProps: {
            day: lecture.day,
            slot: lecture.slot,
            completed: lecture.completed
        }
    }));
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridWeek',
        events: events,
        slotMinTime: '08:00:00',
        slotMaxTime: '18:00:00',
        allDaySlot: false,
        slotDuration: '01:00:00',
        eventClick: function(info) {
            alert(
                `Subject: ${info.event.title}\n` +
                `Day: ${info.event.extendedProps.day}\n` +
                `Slot: ${info.event.extendedProps.slot}\n` +
                `Completed: ${info.event.extendedProps.completed ? 'Yes' : 'No'}`
            );
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        eventDidMount: function(info) {
            info.el.style.backgroundColor = getSubjectColor(info.event.title.split(' ')[0]);
        }
    });
    calendar.render();
}

function handleLogout() {
    fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => {
            currentUser = null;
            window.location.href = '/index.ejs';
        });
}

function getSubjectColor(subject) {
    const subjectColors = {
        'MERN': '#e74c3c',
        'AI/ML': '#3498db',
        'DSA': '#f39c12',
        'C++': '#27ae60',
        'Java': '#9b59b6',
        // 'C': '#e67e22',
        // 'Python': '#1abc9c',
        // 'Networking': '#34495e'
    };
    return subjectColors[subject] || '#667eea';
}

function setActiveSidebar(activeId) {
    document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

window.deleteLecture = deleteLecture;
window.markLectureCompleted = markLectureCompleted;