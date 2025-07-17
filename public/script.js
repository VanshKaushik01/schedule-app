// async function api(url, options = {}) {
//     const res = await fetch(url, options);
//     if (!res.ok) throw new Error((await res.json()).error || 'API error');
//     return res.json();
// }

// let currentUser = null;

// document.addEventListener('DOMContentLoaded', async function() {
//     const currentPage = window.location.pathname.split('/').pop();
//     if (currentPage === 'index.html' || currentPage === '') {
//         initializeLoginPage();
//     } else if (currentPage === 'signup.html') {
//         initializeSignupPage();
//     } else if (currentPage === 'admin.html') {
//         await initializeAdminPage();
//     } else if (currentPage === 'teacher.html') {
//         await initializeTeacherPage();
//     }
// });

// // --- Login ---
// function initializeLoginPage() {
//     const loginForm = document.getElementById('loginForm');
//     if (loginForm) {
//         loginForm.addEventListener('submit', handleLogin);
//     }
// }

// async function handleLogin(event) {
//     event.preventDefault();
//     const username = document.getElementById('username').value.trim();
//     const password = document.getElementById('password').value;
//     if (!username || !password) {
//         alert('Please fill in all fields');
//         return;
//     }
//     try {
//         const user = await api('/api/login', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ username, password }),
//             credentials: 'include'
//         });
//         currentUser = user;
//         if (user.role === 'admin') {
//             window.location.href = 'admin.html';
//         } else if (user.role === 'teacher') {
//             window.location.href = 'teacher.html';
//         }
//     } catch (err) {
//         alert(err.message);
//     }
// }

// // --- Signup ---
// function initializeSignupPage() {
//     const signupForm = document.getElementById('signupForm');
//     if (signupForm) {
//         signupForm.addEventListener('submit', handleSignup);
//     }
// }

// async function handleSignup(event) {
//     event.preventDefault();
//     const username = document.getElementById('username').value.trim();
//     const email = document.getElementById('email').value.trim();
//     const password = document.getElementById('password').value;
//     const role = document.getElementById('role').value;
//     if (!username || !email || !password || !role) {
//         alert('Please fill in all fields');
//         return;
//     }
//     if (password.length < 6) {
//         alert('Password must be at least 6 characters long');
//         return;
//     }
//     try {
//         const user = await api('/api/signup', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ username, email, password, role }),
//             credentials: 'include'
//         });
//         currentUser = user;
//         alert('Account created successfully!');
//         if (role === 'admin') {
//             window.location.href = 'admin.html';
//         } else if (role === 'teacher') {
//             window.location.href = 'teacher.html';
//         }
//     } catch (err) {
//         alert(err.message);
//     }
// }

// // --- Admin Dashboard ---
// async function initializeAdminPage() {
//     // Try to get user info from backend (JWT)
//     try {
//         const user = await api('/api/me', { credentials: 'include' });
//         currentUser = user;
//     } catch {
//         window.location.href = 'index.html';
//         return;
//     }
//     if (!currentUser || currentUser.role !== 'admin') {
//         window.location.href = 'index.html';
//         return;
//     }
//     const userDisplay = document.getElementById('userDisplay');
//     if (userDisplay) {
//         userDisplay.textContent = `Welcome, ${currentUser.username} (Admin)`;
//     }
//     const lectureForm = document.getElementById('lectureForm');
//     if (lectureForm) {
//         lectureForm.addEventListener('submit', handleLectureForm);
//     }
//     const logoutBtn = document.getElementById('logoutBtn');
//     if (logoutBtn) {
//         logoutBtn.addEventListener('click', handleLogout);
//     }
//     await populateTeacherDropdown();
//     await renderTimetable();
//     await renderCalendar();
//     await renderLectureCounts();
// }

// async function populateTeacherDropdown() {
//     const teacherSelect = document.getElementById('teacher');
//     if (!teacherSelect) return;
//     try {
//         const teachers = await api('/api/teachers', { credentials: 'include' });
//         teacherSelect.innerHTML = '<option value="">Select Teacher</option>' +
//             teachers.map(t => `<option value="${t.username}">${t.username}</option>`).join('');
//     } catch (err) {
//         teacherSelect.innerHTML = '<option value="">No teachers found</option>';
//     }
// }

// async function handleLectureForm(event) {
//     event.preventDefault();
//     const formData = new FormData(event.target);
//     const lecture = {
//         subject: formData.get('subject'),
//         room: formData.get('room'),
//         day: formData.get('day'),
//         date: formData.get('date'),
//         slot: formData.get('slot'),
//         teacher: formData.get('teacher')
//     };
//     try {
//         await api('/api/lectures', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(lecture),
//             credentials: 'include'
//         });
//         event.target.reset();
//         await renderTimetable();
//         await renderCalendar();
//         await renderLectureCounts();
//         alert('Lecture added successfully!');
//     } catch (err) {
//         alert(err.message);
//     }
// }

// async function renderTimetable() {
//     const tableBody = document.getElementById('lectureTableBody');
//     if (!tableBody) return;
//     let lectures = [];
//     try {
//         lectures = await api('/api/lectures', { credentials: 'include' });
//     } catch (err) {
//         tableBody.innerHTML = '<tr><td colspan="8">Failed to load lectures</td></tr>';
//         return;
//     }
//     tableBody.innerHTML = '';
//     lectures.forEach(lecture => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//             <td>${lecture.subject}</td>
//             <td>${lecture.room}</td>
//             <td>${lecture.day}</td>
//             <td>${lecture.date}</td>
//             <td>${lecture.slot}</td>
//             <td>${lecture.teacher}</td>
//             <td>${lecture.completed ? 'Yes' : 'No'}</td>
//             <td>
//                 <button class="btn-delete" onclick="deleteLecture(${lecture.id})">Delete</button>
//                 ${!lecture.completed ? `<button class="btn-complete" onclick="markLectureCompleted(${lecture.id})">Mark Completed</button>` : ''}
//             </td>
//         `;
//         tableBody.appendChild(row);
//     });
// }

// async function deleteLecture(id) {
//     if (!confirm('Are you sure you want to delete this lecture?')) return;
//     try {
//         await api(`/api/lectures/${id}`, { method: 'DELETE', credentials: 'include' });
//         await renderTimetable();
//         await renderCalendar();
//         await renderLectureCounts();
//     } catch (err) {
//         alert(err.message);
//     }
// }

// async function markLectureCompleted(id) {
//     try {
//         await api(`/api/lectures/${id}/complete`, { method: 'POST', credentials: 'include' });
//         await renderTimetable();
//         await renderCalendar();
//         await renderLectureCounts();
//     } catch (err) {
//         alert(err.message);
//     }
// }

// async function renderCalendar() {
//     const calendarEl = document.getElementById('calendar');
//     if (!calendarEl) return;
//     calendarEl.innerHTML = '';
//     let lectures = [];
//     try {
//         lectures = await api('/api/lectures', { credentials: 'include' });
//     } catch (err) {
//         return;
//     }
//     const events = lectures.map(lecture => ({
//         title: `${lecture.subject} (${lecture.room}) - ${lecture.teacher} [${lecture.slot}]${lecture.completed ? ' ✔' : ''}`,
//         start: lecture.date,
//         allDay: true,
//         backgroundColor: getSubjectColor(lecture.subject),
//         borderColor: getSubjectColor(lecture.subject),
//         extendedProps: {
//             day: lecture.day,
//             slot: lecture.slot,
//             teacher: lecture.teacher,
//             completed: lecture.completed
//         }
//     }));
//     const calendar = new FullCalendar.Calendar(calendarEl, {
//         initialView: 'dayGridWeek',
//         events: events,
//         eventClick: function(info) {
//             alert(
//                 `Subject: ${info.event.title}\n` +
//                 `Day: ${info.event.extendedProps.day}\n` +
//                 `Slot: ${info.event.extendedProps.slot}\n` +
//                 `Teacher: ${info.event.extendedProps.teacher}\n` +
//                 `Completed: ${info.event.extendedProps.completed ? 'Yes' : 'No'}`
//             );
//         },
//         headerToolbar: {
//             left: 'prev,next today',
//             center: 'title',
//             right: 'dayGridMonth,dayGridWeek,dayGridDay'
//         },
//         eventDidMount: function(info) {
//             info.el.style.backgroundColor = getSubjectColor(info.event.title.split(' ')[0]);
//         }
//     });
//     calendar.render();
// }

// async function renderLectureCounts() {
//     if (!currentUser) return;
//     try {
//         const counts = await api(`/api/lectures/counts/${currentUser.username}`, { credentials: 'include' });
//         document.getElementById('totalLectures').textContent = counts.total;
//         document.getElementById('lecturesDone').textContent = counts.completed;
//         document.getElementById('lecturesLeft').textContent = counts.left;
//     } catch (err) {
//         document.getElementById('totalLectures').textContent = '-';
//         document.getElementById('lecturesDone').textContent = '-';
//         document.getElementById('lecturesLeft').textContent = '-';
//     }
// }

// // --- Teacher Dashboard ---
// async function initializeTeacherPage() {
//     try {
//         const user = await api('/api/me', { credentials: 'include' });
//         currentUser = user;
//     } catch {
//         window.location.href = 'index.html';
//         return;
//     }
//     if (!currentUser || currentUser.role !== 'teacher') {
//         window.location.href = 'index.html';
//         return;
//     }
//     const teacherDisplay = document.getElementById('teacherDisplay');
//     if (teacherDisplay) {
//         teacherDisplay.textContent = `Welcome, ${currentUser.username} (Teacher)`;
//     }
//     const teacherName = document.getElementById('teacherName');
//     if (teacherName) {
//         teacherName.textContent = currentUser.username;
//     }
//     const logoutBtn = document.getElementById('logoutBtn');
//     if (logoutBtn) {
//         logoutBtn.addEventListener('click', handleLogout);
//     } 
//     await renderTeacherTimetable();
//     await renderTeacherCalendar();
//     await renderLectureCounts();
// }

// async function renderTeacherTimetable() {
//     const tableBody = document.getElementById('lectureTableBody');
//     if (!tableBody) return;
//     let lectures = [];
//     try {
//         lectures = await api(`/api/lectures?teacher=${currentUser.username}`, { credentials: 'include' });
//     } catch (err) {
//         tableBody.innerHTML = '<tr><td colspan="7">Failed to load lectures</td></tr>';
//         return;
//     }
//     tableBody.innerHTML = '';
//     lectures.forEach(lecture => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//             <td>${lecture.subject}</td>
//             <td>${lecture.room}</td>
//             <td>${lecture.day}</td>
//             <td>${lecture.date}</td>
//             <td>${lecture.slot}</td>
//             <td>${lecture.completed ? 'Yes' : 'No'}</td>
//         `;
//         tableBody.appendChild(row);
//     });
// }



// async function renderTeacherCalendar() {
//     const calendarEl = document.getElementById('calendar');
//     if (!calendarEl) return;
//     calendarEl.innerHTML = '';
//     let lectures = [];
//     try {
//         lectures = await api(`/api/lectures?teacher=${currentUser.username}`, { credentials: 'include' });
//     } catch (err) {
//         return;
//     }
//     const events = lectures.map(lecture => ({
//         title: `${lecture.subject} (${lecture.room}) [${lecture.slot}]${lecture.completed ? ' ✔' : ''}` ,
//         start: lecture.date,
//         allDay: true,
//         backgroundColor: getSubjectColor(lecture.subject),
//         borderColor: getSubjectColor(lecture.subject),
//         extendedProps: {
//             day: lecture.day,
//             slot: lecture.slot,
//             completed: lecture.completed
//         }
//     }));
//     const calendar = new FullCalendar.Calendar(calendarEl, {
//         initialView: 'dayGridWeek',
//         events: events,
//         eventClick: function(info) {
//             alert(
//                 `Subject: ${info.event.title}\n` +
//                 `Day: ${info.event.extendedProps.day}\n` +
//                 `Slot: ${info.event.extendedProps.slot}\n` +
//                 `Completed: ${info.event.extendedProps.completed ? 'Yes' : 'No'}`
//             );
//         },
//         headerToolbar: {
//             left: 'prev,next today',
//             center: 'title',
//             right: 'dayGridMonth,dayGridWeek,dayGridDay'
//         },
//         slotMinTime: '08:00:00',
//         slotMaxTime: '18:00:00',
//         allDaySlot: false,
//         slotDuration: '01:00:00',
//         eventDidMount: function(info) {
//             info.el.style.backgroundColor = getSubjectColor(info.event.title.split(' ')[0]);
//         }
//     });
//     calendar.render();
// }

// function handleLogout() {
//     fetch('/api/logout', { method: 'POST', credentials: 'include' })
//         .then(() => {
//             currentUser = null;
//             window.location.href = 'index.html';
//         });
// }

// function getSubjectColor(subject) {
//     const subjectColors = {
//         'MERN': '#e74c3c',
//         'AI/ML': '#3498db',
//         'DSA': '#f39c12',
//         'C++': '#27ae60',
//         'Java': '#9b59b6',
//         'C': '#e67e22',
//         'Python': '#1abc9c',
//         'Networking': '#34495e'
//     };
//     return subjectColors[subject] || '#667eea';
// }

// document.getElementById('dashboardNav').addEventListener('click', function() {
//     document.getElementById('dashboardPage').style.display = '';
//     document.getElementById('calendarPage').style.display = 'none';
//     setActiveSidebar('dashboardNav');
// });

// document.getElementById('calendarNav').addEventListener('click', function() {
//     document.getElementById('dashboardPage').style.display = 'none';
//     document.getElementById('calendarPage').style.display = '';
//     setActiveSidebar('calendarNav');

//     renderTeacherCalendar(
//         lectures.filter(
//             lec => lec.teacher === currentUser.username || lec.username === currentUser.username
//         )
//     );
// });

// function setActiveSidebar(activeId) {
//     document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
//     document.getElementById(activeId).classList.add('active');
// }


async function api(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error((await res.json()).error || 'API error');
    return res.json();
}

let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'index.html' || currentPage === '') {
        initializeLoginPage();
    } else if (currentPage === 'signup.html') {
        initializeSignupPage();
    } else if (currentPage === 'admin.html') {
        await initializeAdminPage();
    } else if (currentPage === 'teacher.html') {
        await initializeTeacherPage();
    }
});

// --- Login ---
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
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (user.role === 'teacher') {
            window.location.href = 'teacher.html';
        }
    } catch (err) {
        alert(err.message);
    }
}

// --- Signup ---
function initializeSignupPage() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

async function handleSignup(event) {
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
    try {
        const user = await api('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role }),
            credentials: 'include'
        });
        currentUser = user;
        alert('Account created successfully!');
        if (role === 'admin') {
            window.location.href = 'admin.html';
        } else if (role === 'teacher') {
            window.location.href = 'teacher.html';
        }
    } catch (err) {
        alert(err.message);
    }
}

// --- Admin Dashboard ---
async function initializeAdminPage() {
    // Try to get user info from backend (JWT)
    try {
        const user = await api('/api/me', { credentials: 'include' });
        currentUser = user;
    } catch {
        window.location.href = 'index.html';
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
    await populateTeacherDropdown();
    await renderTimetable();
    await renderCalendar();
    await renderLectureCounts();
}

async function populateTeacherDropdown() {
    const teacherSelect = document.getElementById('teacher');
    if (!teacherSelect) return;
    try {
        const teachers = await api('/api/teachers', { credentials: 'include' });
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
        alert(err.message);
    }
}

async function renderTimetable() {
    const tableBody = document.getElementById('lectureTableBody');
    if (!tableBody) return;
    let lectures = [];
    try {
        lectures = await api('/api/lectures', { credentials: 'include' });
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="8">Failed to load lectures</td></tr>';
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
            <td>${lecture.teacher}</td>
            <td>${lecture.completed ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn-delete" onclick="deleteLecture(${lecture.id})">Delete</button>
                ${!lecture.completed ? `<button class="btn-complete" onclick="markLectureCompleted(${lecture.id})">Mark Completed</button>` : ''}
            </td>
        `;
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
    } catch (err) {
        alert(err.message);
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
        document.getElementById('totalLectures').textContent = counts.total;
        document.getElementById('lecturesDone').textContent = counts.completed;
        document.getElementById('lecturesLeft').textContent = counts.left;
    } catch (err) {
        document.getElementById('totalLectures').textContent = '-';
        document.getElementById('lecturesDone').textContent = '-';
        document.getElementById('lecturesLeft').textContent = '-';
    }
}

// --- Teacher Dashboard ---
async function initializeTeacherPage() {
    try {
        const user = await api('/api/me', { credentials: 'include' });
        currentUser = user;
    } catch {
        window.location.href = 'index.html';
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
    
    // Initialize navigation
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
        
        // Set initial view
        setActiveSidebar('dashboardNav');
        document.getElementById('dashboardPage').style.display = '';
        document.getElementById('calendarPage').style.display = 'none';
    }
    
    await renderTeacherTimetable();
    await renderLectureCounts();
}

async function renderTeacherTimetable() {
    const tableBody = document.getElementById('lectureTableBody');
    if (!tableBody) return;
    let lectures = [];
    try {
        lectures = await api(`/api/lectures?teacher=${currentUser.username}`, { credentials: 'include' });
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="7">Failed to load lectures</td></tr>';
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
            window.location.href = 'index.html';
        });
}

function getSubjectColor(subject) {
    const subjectColors = {
        'MERN': '#e74c3c',
        'AI/ML': '#3498db',
        'DSA': '#f39c12',
        'C++': '#27ae60',
        'Java': '#9b59b6',
        'C': '#e67e22',
        'Python': '#1abc9c',
        'Networking': '#34495e'
    };
    return subjectColors[subject] || '#667eea';
}

function setActiveSidebar(activeId) {
    document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

// Make functions available globally for HTML onclick handlers
window.deleteLecture = deleteLecture;
window.markLectureCompleted = markLectureCompleted;