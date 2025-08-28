// Simple Homeschool SPA using HTML/CSS/JS + JSON (data.json)
// State
const state = {
  data: null,
  user: null,
  view: "dashboard",
};

// Elements
const landing = document.getElementById('landing');
const auth = document.getElementById('auth');
const app = document.getElementById('app');
const panelTitle = document.getElementById('panel-title');
const welcome = document.getElementById('welcome');
const viewContainer = document.getElementById('view-container');
const authTitle = document.getElementById('auth-title');
const roleRow = document.getElementById('role-row');
const passwordRow = document.getElementById('password-row');
const authSubmit = document.getElementById('auth-submit');
const authFooter = document.getElementById('auth-footer');

// Routing for landing/auth toggles
document.querySelectorAll('[data-route]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const route = e.currentTarget.getAttribute('data-route');
    if (route === 'login') showAuth('login');
    if (route === 'register') showAuth('register');
  });
});

function showLanding() {
  landing.classList.remove('hidden');
  auth.classList.add('hidden');
  app.classList.add('hidden');
}

function showAuth(kind) {
  landing.classList.add('hidden');
  auth.classList.remove('hidden');
  app.classList.add('hidden');

  const isLogin = kind === 'login';
  authTitle.textContent = isLogin ? 'Login' : 'Register';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  roleRow.classList.toggle('hidden', isLogin);
  authSubmit.textContent = isLogin ? 'Login' : 'Register';
  authSubmit.dataset.mode = kind;
  authFooter.innerHTML = isLogin
    ? `Don't have an account? <a href="#" data-route="register">Register here</a>`
    : `Already have an account? <a href="#" data-route="login">Login here</a>`;

  // rebind footer link
  authFooter.querySelector('a')?.addEventListener('click', (e) => {
    e.preventDefault();
    showAuth(isLogin ? 'register' : 'login');
  });
}

function showApp() {
  landing.classList.add('hidden');
  auth.classList.add('hidden');
  app.classList.remove('hidden');

  const u = state.user;
  panelTitle.textContent = capitalize(u.role) + ' Panel';
  welcome.textContent = `Welcome, ${u.displayName}`;
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.view === state.view);
    el.onclick = () => {
      state.view = el.dataset.view;
      document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a === el));
      renderView();
    };
  });
  renderView();
}

// Local Storage helpers
const LS_USERS = 'hs_users';
const LS_SESSION = 'hs_session';

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || [];
  } catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}
function setSession(username) {
  localStorage.setItem(LS_SESSION, username);
}
function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

// Auth submit
authSubmit.addEventListener('click', () => {
  const mode = authSubmit.dataset.mode || 'login';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  if (!username || !password) return alert('Please fill in username and password.');

  const users = loadUsers();

  if (mode === 'register') {
    if (users.some(u => u.username === username)) return alert('Username already exists.');
    // Minimal registration; associate demo data by role
    const demoUser = (state.data.users.find(u => u.username === username) ||
                     state.data.users.find(u => u.role === role)) || null;
    const user = {
      username, password, role,
      displayName: demoUser?.displayName || username,
      childrenIds: demoUser?.childrenIds || [],
      gradeLevel: demoUser?.gradeLevel || null,
      studentId: demoUser?.studentId || null,
      teacherCourseIds: demoUser?.teacherCourseIds || []
    };
    users.push(user);
    saveUsers(users);
    alert('Registered! You can log in now.');
    showAuth('login');
  } else {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return alert('Invalid credentials.');
    state.user = user;
    setSession(user.username);
    showApp();
  }
});

document.getElementById('logout').addEventListener('click', () => {
  clearSession();
  state.user = null;
  state.view = 'dashboard';
  showLanding();
});

// Render views
function renderView() {
  const u = state.user;
  if (!u) return;

  if (state.view === 'dashboard') {
    if (u.role === 'student') renderStudentDashboard(u);
    if (u.role === 'parent') renderParentDashboard(u);
    if (u.role === 'teacher') renderTeacherDashboard(u);
  } else if (state.view === 'assignments') {
    renderAssignments(u);
  } else if (state.view === 'grades') {
    renderGrades(u);
  }
}

function renderStudentDashboard(u) {
  const student = getStudentByUser(u);
  const courses = state.data.courses.filter(c => student.courseIds.includes(c.id));
  const list = courses.map(c => `<li>${c.name}</li>`).join('');
  viewContainer.innerHTML = `
    <section class="card">
      <p><strong>Grade Level:</strong> ${student.gradeLevel}</p>
      <h3>Enrolled Courses:</h3>
      <ul class="list-plain">${list}</ul>
    </section>
  `;
}

function renderParentDashboard(u) {
  const children = u.childrenIds.map(id => state.data.students.find(s => s.id === id)).filter(Boolean);
  viewContainer.innerHTML = children.map(ch => {
    const courses = state.data.courses.filter(c => ch.courseIds.includes(c.id));
    return `
      <section class="card">
        <h3>${ch.name} <span class="muted">(Grade ${ch.gradeLevel.split(' ')[1]})</span></h3>
        <ul class="list-plain">${courses.map(c => `<li>${c.name}</li>`).join('')}</ul>
      </section>
    `;
  }).join('');
}

function renderTeacherDashboard(u) {
  const courses = state.data.courses.filter(c => u.teacherCourseIds.includes(c.id));
  viewContainer.innerHTML = courses.map(course => {
    const students = state.data.students.filter(s => s.courseIds.includes(course.id));
    return `
      <section class="card">
        <h3>${course.name}</h3>
        <p class="muted">Students:</p>
        <ul class="list-plain">
          ${students.map(s => `<li>${s.name}</li>`).join('')}
        </ul>
      </section>
    `;
  }).join('');
}

function renderAssignments(u) {
  let items = [];
  if (u.role === 'student') {
    const student = getStudentByUser(u);
    items = state.data.assignments.filter(a => a.studentId === student.id);
  } else if (u.role === 'parent') {
    items = state.data.assignments.filter(a => u.childrenIds.includes(a.studentId));
  } else if (u.role === 'teacher') {
    // teacher sees assignments from their courses' students
    const students = state.data.students.filter(s => s.courseIds.some(id => u.teacherCourseIds.includes(id)));
    const studentIds = new Set(students.map(s => s.id));
    items = state.data.assignments.filter(a => studentIds.has(a.studentId));
  }
  const html = items.map(renderAssignmentCard).join('') || emptyState('No assignments found.');
  viewContainer.innerHTML = `<div class="list">${html}</div>`;
}

function renderGrades(u) {
  let items = [];
  if (u.role === 'student') {
    const student = getStudentByUser(u);
    items = state.data.grades.filter(g => g.studentId === student.id);
  } else if (u.role === 'parent') {
    items = state.data.grades.filter(g => u.childrenIds.includes(g.studentId));
  } else if (u.role === 'teacher') {
    const students = state.data.students.filter(s => s.courseIds.some(id => u.teacherCourseIds.includes(id)));
    const studentIds = new Set(students.map(s => s.id));
    items = state.data.grades.filter(g => studentIds.has(g.studentId));
  }
  const html = items.map(renderGradeCard).join('') || emptyState('No grades yet.');
  viewContainer.innerHTML = `<div class="list">${html}</div>`;
}

// Helpers for cards
function renderAssignmentCard(a) {
  const t = document.getElementById('assignment-card').content.cloneNode(true);
  t.querySelector('.item-title').textContent = a.title;
  t.querySelector('.item-desc').textContent = a.description;
  t.querySelector('.item-meta').textContent = `Due: ${a.due}`;
  const div = document.createElement('div');
  div.appendChild(t);
  return div.innerHTML;
}
function renderGradeCard(g) {
  const t = document.getElementById('grade-card').content.cloneNode(true);
  const course = state.data.courses.find(c => c.id === g.courseId)?.name || 'Course';
  t.querySelector('.item-title').textContent = `${course}`;
  t.querySelector('.item-desc').innerHTML = `<strong>Grade:</strong> ${g.grade}<br/><span class="muted">Feedback:</span> ${g.feedback}`;
  const div = document.createElement('div');
  div.appendChild(t);
  return div.innerHTML;
}
function emptyState(msg) {
  return `<section class="card"><p class="muted">${msg}</p></section>`;
}

function getStudentByUser(u) {
  if (u.studentId) return state.data.students.find(s => s.id === u.studentId);
  // fall back: first student
  return state.data.students[0];
}

function capitalize(s){ return s[0].toUpperCase()+s.slice(1); }

// Boot
(async function init() {
  // Load JSON data
  try {
    const res = await fetch('data.json');
    state.data = await res.json();
  } catch (e) {
    console.error('Failed to load data.json', e);
    // Fallback minimal set if fetch fails (e.g., running directly from file://)
    state.data = { users: [], students: [], courses: [], assignments: [], grades: [] };
  }

  // Seed demo users into localStorage if not present
  if (loadUsers().length === 0) {
    const seed = state.data.users.map(u => ({
      username: u.username,
      password: u.password,
      role: u.role,
      displayName: u.displayName,
      childrenIds: u.childrenIds || [],
      gradeLevel: u.gradeLevel || null,
      studentId: u.studentId || null,
      teacherCourseIds: u.teacherCourseIds || []
    }));
    saveUsers(seed);
  }

  // Restore session if any
  const sessionUser = loadUsers().find(u => u.username === localStorage.getItem(LS_SESSION));
  if (sessionUser) {
    state.user = sessionUser;
    showApp();
  } else {
    showLanding();
  }
})();
