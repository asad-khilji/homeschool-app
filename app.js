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

// Local Storage keys
const LS_USERS = 'hs_users';
const LS_SESSION = 'hs_session';
const LS_DATA = 'hs_data';

// Local Storage helpers
function loadUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS)) || []; }
  catch { return []; }
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
function loadDataOverride() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveDataOverride() {
  localStorage.setItem(LS_DATA, JSON.stringify(state.data));
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
  if (u.role === 'teacher') {
    // --- Add Assignment form ---
    const teacherStudents = getTeacherStudents(u);
    const studentOptions = teacherStudents
      .map(s => `<option value="${s.id}">${s.name} (${s.gradeLevel})</option>`).join('');
    const courseOptions = u.teacherCourseIds
      .map(id => state.data.courses.find(c => c.id === id))
      .filter(Boolean)
      .map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const addForm = `
      <section class="card" style="margin-bottom:1rem">
        <h3 style="margin-top:0">Add Assignment</h3>
        <form id="new-assignment-form">
          <div class="form-field">
            <label for="na-student">Student</label>
            <select id="na-student" required>
              <option value="">Select student</option>
              ${studentOptions}
            </select>
          </div>
          <div class="form-field">
            <label for="na-course">Course</label>
            <select id="na-course" required>
              <option value="">Select course</option>
              ${courseOptions}
            </select>
          </div>
          <div class="form-field">
            <label for="na-title">Title</label>
            <input id="na-title" type="text" required />
          </div>
          <div class="form-field">
            <label for="na-desc">Description</label>
            <input id="na-desc" type="text" required />
          </div>
          <div class="form-field">
            <label for="na-due">Due Date</label>
            <input id="na-due" type="date" required />
          </div>
          <button class="btn block" type="submit">Add Assignment</button>
        </form>
      </section>
    `;

    // Teacher-visible assignments = for their students
    const teacherStudentIds = new Set(teacherStudents.map(s => s.id));
    const items = state.data.assignments.filter(a => teacherStudentIds.has(a.studentId));

    const rows = items.map(a => renderTeacherAssignmentRow(a, u)).join('') || emptyState('No assignments found.');
    viewContainer.innerHTML = addForm + rows;

    // Bind Add form
    document.getElementById('new-assignment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const studentId = document.getElementById('na-student').value;
      const courseId = document.getElementById('na-course').value;
      const title = document.getElementById('na-title').value.trim();
      const description = document.getElementById('na-desc').value.trim();
      const due = document.getElementById('na-due').value;

      if (!studentId || !courseId || !title || !description || !due) return alert('Please complete all fields.');

      const student = state.data.students.find(s => s.id === studentId);
      const validCourse = student?.courseIds?.includes(courseId) && u.teacherCourseIds.includes(courseId);
      if (!validCourse) return alert('Selected student is not enrolled in that course (or you do not teach it).');

      state.data.assignments.push({
        id: 'a' + Date.now(),
        studentId, courseId, title, description, due
      });
      saveDataOverride();
      renderAssignments(u);
    });

    // Bind Edit toggles + forms
    bindAssignmentEditHandlers(u);

    return;
  }

  // Student / Parent read-only
  let items = [];
  if (u.role === 'student') {
    const student = getStudentByUser(u);
    items = state.data.assignments.filter(a => a.studentId === student.id);
  } else if (u.role === 'parent') {
    items = state.data.assignments.filter(a => u.childrenIds.includes(a.studentId));
  }
  const html = items.map(renderAssignmentCard).join('') || emptyState('No assignments found.');
  viewContainer.innerHTML = `<div class="list">${html}</div>`;
}

function renderGrades(u) {
  if (u.role === 'teacher') {
    const teacherStudents = getTeacherStudents(u);
    const teacherStudentIds = new Set(teacherStudents.map(s => s.id));

    // Add Grade form
    const studentOptions = teacherStudents
      .map(s => `<option value="${s.id}">${s.name} (${s.gradeLevel})</option>`).join('');

    const addForm = `
      <section class="card" style="margin-bottom:1rem">
        <h3>Add Grade</h3>
        <form id="new-grade-form">
          <div class="form-field">
            <label for="ng-student">Student</label>
            <select id="ng-student" required>
              <option value="">Select student</option>
              ${studentOptions}
            </select>
          </div>
          <div class="form-field">
            <label for="ng-course">Course</label>
            <select id="ng-course" required>
              <option value="">Select course</option>
            </select>
          </div>
          <div class="form-field">
            <label for="ng-grade">Grade</label>
            <input id="ng-grade" type="text" placeholder="e.g., A-, 92%" required />
          </div>
          <div class="form-field">
            <label for="ng-feedback">Feedback</label>
            <input id="ng-feedback" type="text" placeholder="Optional comments" />
          </div>
          <button class="btn block" type="submit">Add Grade</button>
        </form>
      </section>
    `;

    // Existing grades (editable)
    const items = state.data.grades.filter(g => teacherStudentIds.has(g.studentId));
    const rows = items.map(g => {
      const course = state.data.courses.find(c => c.id === g.courseId)?.name || 'Course';
      const student = state.data.students.find(s => s.id === g.studentId)?.name || 'Student';
      return `
        <section class="card">
          <h3>${course} — ${student}</h3>
          <form data-grade-id="${g.id}" class="grade-edit-form">
            <div class="form-field"><label>Grade</label><input name="grade" value="${escapeHtml(g.grade)}" required /></div>
            <div class="form-field"><label>Feedback</label><input name="feedback" value="${escapeHtml(g.feedback)}" /></div>
            <button class="btn" type="submit">Save</button>
          </form>
        </section>`;
    }).join('') || emptyState('No grades yet.');

    viewContainer.innerHTML = addForm + rows;

    // Dynamic courses for Add Grade
    const ngStudent = document.getElementById('ng-student');
    const ngCourse  = document.getElementById('ng-course');
    const repopulateCourseOptions = () => {
      const sid = ngStudent.value;
      ngCourse.innerHTML = `<option value="">Select course</option>`;
      if (!sid) return;
      const student = state.data.students.find(s => s.id === sid);
      if (!student) return;
      const allowed = student.courseIds.filter(cid => state.user.teacherCourseIds.includes(cid));
      ngCourse.insertAdjacentHTML('beforeend',
        allowed.map(cid => {
          const c = state.data.courses.find(x => x.id === cid);
          return c ? `<option value="${c.id}">${c.name}</option>` : '';
        }).join('')
      );
    };
    ngStudent.addEventListener('change', repopulateCourseOptions);
    repopulateCourseOptions();

    // Add Grade submit
    document.getElementById('new-grade-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const studentId = ngStudent.value;
      const courseId  = ngCourse.value;
      const grade     = document.getElementById('ng-grade').value.trim();
      const feedback  = document.getElementById('ng-feedback').value.trim();
      if (!studentId || !courseId || !grade) return alert('Please fill in student, course, and grade.');
      const student = state.data.students.find(s => s.id === studentId);
      const validCourse = student?.courseIds?.includes(courseId) && state.user.teacherCourseIds.includes(courseId);
      if (!validCourse) return alert('Selected student is not in that course (or you do not teach it).');
      state.data.grades.push({ id: 'g' + Date.now(), studentId, courseId, grade, feedback });
      saveDataOverride();
      alert('Grade added.');
      renderGrades(u);
    });

    // Edit existing grades
    document.querySelectorAll('.grade-edit-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const id = form.dataset.gradeId;
        const idx = state.data.grades.findIndex(x => x.id === id);
        if (idx === -1) return alert('Grade not found.');
        state.data.grades[idx].grade = form.grade.value.trim();
        state.data.grades[idx].feedback = form.feedback.value.trim();
        saveDataOverride();
        alert('Grade updated.');
      });
    });

    return;
  }

  // Student / Parent read-only
  let items = [];
  if (u.role === 'student') {
    const student = getStudentByUser(u);
    items = state.data.grades.filter(g => g.studentId === student.id);
  } else if (u.role === 'parent') {
    items = state.data.grades.filter(g => u.childrenIds.includes(g.studentId));
  }
  const html = items.map(renderGradeCard).join('') || emptyState('No grades yet.');
  viewContainer.innerHTML = `<div class="list">${html}</div>`;
}

// ---------- Teacher Assignment Row (view + inline edit) ----------
function renderTeacherAssignmentRow(a, u) {
  const courseName  = state.data.courses.find(c => c.id === a.courseId)?.name || 'Course';
  const studentName = state.data.students.find(s => s.id === a.studentId)?.name || 'Student';

  // Build options lists
  const teacherStudents = getTeacherStudents(u);
  const studentOptions = teacherStudents
    .map(s => `<option value="${s.id}" ${s.id===a.studentId?'selected':''}>${s.name} (${s.gradeLevel})</option>`).join('');

  const teacherCourses = u.teacherCourseIds
    .map(id => state.data.courses.find(c => c.id === id))
    .filter(Boolean);

  // Filter course options to those both taught by teacher AND enrolled by the (current) student
  const currentStudent = state.data.students.find(s => s.id === a.studentId);
  const allowedCourseIds = new Set(
    (currentStudent?.courseIds || []).filter(cid => u.teacherCourseIds.includes(cid))
  );
  const courseOptions = teacherCourses
    .map(c => `<option value="${c.id}" ${c.id===a.courseId?'selected':''} ${allowedCourseIds.has(c.id)?'':'disabled'}>${c.name}</option>`)
    .join('');

  return `
    <section class="card assignment-row" data-assignment-id="${a.id}">
      <h3 style="margin-top:0">${escapeHtml(a.title)}</h3>
      <p class="muted">${courseName} — ${studentName}</p>
      <p>${escapeHtml(a.description)}</p>
      <p class="muted">Due: ${escapeHtml(a.due)}</p>
      <div class="row gap">
        <button class="btn assignment-edit-toggle" type="button">Edit</button>
      </div>

      <form class="assignment-edit-form hidden" data-assignment-id="${a.id}" style="margin-top:1rem">
        <div class="form-field">
          <label>Student</label>
          <select name="studentId" required class="edit-student">
            ${studentOptions}
          </select>
        </div>
        <div class="form-field">
          <label>Course</label>
          <select name="courseId" required class="edit-course">
            ${courseOptions}
          </select>
          <p class="small muted">Only courses you teach and the student is enrolled in are enabled.</p>
        </div>
        <div class="form-field">
          <label>Title</label>
          <input name="title" type="text" value="${escapeHtml(a.title)}" required />
        </div>
        <div class="form-field">
          <label>Description</label>
          <input name="description" type="text" value="${escapeHtml(a.description)}" required />
        </div>
        <div class="form-field">
          <label>Due Date</label>
          <input name="due" type="date" value="${escapeHtml(a.due)}" required />
        </div>
        <div class="row gap">
          <button class="btn" type="submit">Save</button>
          <button class="btn btn-ghost assignment-cancel" type="button">Cancel</button>
        </div>
      </form>
    </section>
  `;
}

function bindAssignmentEditHandlers(u) {
  // Toggle forms
  document.querySelectorAll('.assignment-edit-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.assignment-row');
      const form = section.querySelector('.assignment-edit-form');
      form.classList.toggle('hidden');
    });
  });
  // Cancel buttons
  document.querySelectorAll('.assignment-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const form = e.currentTarget.closest('.assignment-edit-form');
      form.classList.add('hidden');
    });
  });
  // When student changes, re-limit course options to intersection
  document.querySelectorAll('.assignment-edit-form .edit-student').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const form = e.currentTarget.closest('.assignment-edit-form');
      const studentId = e.currentTarget.value;
      const courseSel = form.querySelector('.edit-course');
      // Rebuild course options: teacher's courses ∩ student's courses
      const student = state.data.students.find(s => s.id === studentId);
      const allowedIds = new Set((student?.courseIds || []).filter(cid => state.user.teacherCourseIds.includes(cid)));
      const teacherCourses = state.user.teacherCourseIds
        .map(id => state.data.courses.find(c => c.id === id))
        .filter(Boolean);
      courseSel.innerHTML = teacherCourses.map(c => {
        const disabled = allowedIds.has(c.id) ? '' : 'disabled';
        return `<option value="${c.id}" ${disabled}>${c.name}</option>`;
      }).join('');
      // If nothing selected or disabled, pick first enabled
      const enabled = [...courseSel.options].find(o => !o.disabled);
      if (enabled) courseSel.value = enabled.value;
    });
  });
  // Save edits
  document.querySelectorAll('.assignment-edit-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = form.dataset.assignmentId;
      const idx = state.data.assignments.findIndex(x => x.id === id);
      if (idx === -1) return alert('Assignment not found.');

      const studentId = form.studentId.value;
      const courseId  = form.courseId.value;
      const title     = form.title.value.trim();
      const desc      = form.description.value.trim();
      const due       = form.due.value;

      if (!studentId || !courseId || !title || !desc || !due) {
        return alert('Please complete all fields.');
      }
      // Validate relationship
      const student = state.data.students.find(s => s.id === studentId);
      const validCourse = student?.courseIds?.includes(courseId) && state.user.teacherCourseIds.includes(courseId);
      if (!validCourse) return alert('Selected student is not in that course (or you do not teach it).');

      Object.assign(state.data.assignments[idx], {
        studentId, courseId, title, description: desc, due
      });
      saveDataOverride();
      alert('Assignment updated.');
      renderAssignments(state.user);
    });
  });
}

// Helpers for read-only cards
function renderAssignmentCard(a) {
  const t = document.getElementById('assignment-card').content.cloneNode(true);
  const course = state.data.courses.find(c => c.id === a.courseId)?.name || 'Course';
  const student = state.data.students.find(s => s.id === a.studentId)?.name || 'Student';
  t.querySelector('.item-title').textContent = a.title;
  t.querySelector('.item-desc').textContent = `${course} — ${student} — ${a.description}`;
  t.querySelector('.item-meta').textContent = `Due: ${a.due}`;
  return t.firstElementChild?.outerHTML || (() => {
    const div = document.createElement('div'); div.appendChild(t); return div.innerHTML;
  })();
}
function renderGradeCard(g) {
  const t = document.getElementById('grade-card').content.cloneNode(true);
  const course = state.data.courses.find(c => c.id === g.courseId)?.name || 'Course';
  const student = state.data.students.find(s => s.id === g.studentId)?.name || 'Student';
  t.querySelector('.item-title').textContent = `${course} — ${student}`;
  t.querySelector('.item-desc').innerHTML = `<strong>Grade:</strong> ${escapeHtml(g.grade)}<br/><span class="muted">Feedback:</span> ${escapeHtml(g.feedback)}`;
  return t.firstElementChild?.outerHTML || (() => {
    const div = document.createElement('div'); div.appendChild(t); return div.innerHTML;
  })();
}
function emptyState(msg) { return `<section class="card"><p class="muted">${msg}</p></section>`; }
function getStudentByUser(u) { return state.data.students.find(s => s.id === u.studentId) || state.data.students[0]; }
function getTeacherStudents(u) { return state.data.students.filter(s => s.courseIds.some(id => u.teacherCourseIds.includes(id))); }
function capitalize(s){ return s ? s[0].toUpperCase()+s.slice(1) : s; }
function escapeHtml(str = '') { return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Boot
(async function init() {
  try {
    const res = await fetch('data.json');
    state.data = await res.json();
  } catch {
    state.data = { users: [], students: [], courses: [], assignments: [], grades: [] };
  }
  const override = loadDataOverride();
  if (override) state.data = override;
  if (loadUsers().length === 0 && Array.isArray(state.data.users)) {
    saveUsers(state.data.users.map(u => ({
      username: u.username, password: u.password, role: u.role,
      displayName: u.displayName, childrenIds: u.childrenIds || [],
      gradeLevel: u.gradeLevel || null, studentId: u.studentId || null,
      teacherCourseIds: u.teacherCourseIds || []
    })));
  }
  const sessionUser = loadUsers().find(u => u.username === localStorage.getItem(LS_SESSION));
  if (sessionUser) { state.user = sessionUser; showApp(); }
  else { showLanding(); }
})();
