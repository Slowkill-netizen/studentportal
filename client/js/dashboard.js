const logoutBtn = document.getElementById('logoutBtn');
const page = document.body.dataset.page;

const sampleAnnouncements = [
  { title: 'Semester registration', message: 'Unit registration closes Friday at 5:00 PM.' },
  { title: 'Library update', message: 'Digital library access is available for all active students.' },
  { title: 'Exam cards', message: 'Exam cards can be downloaded after fee clearance.' },
];

const sampleTimetable = [
  ['Monday', '08:00', 'ENG101', 'Room A12'],
  ['Tuesday', '10:00', 'CS202', 'Lab 3'],
  ['Thursday', '14:00', 'MAT110', 'Room B04'],
];

const samplePayments = [
  ['2026-01-12', 'Receipt #1048', 'KES 18,000'],
  ['2026-02-19', 'Receipt #1192', 'KES 10,000'],
  ['2026-04-03', 'Receipt #1330', 'KES 8,500'],
];

const sampleDocuments = [
  { title: 'Class Notes', type: 'PDF', file: '#' },
  { title: 'Fee Receipt', type: 'PDF', file: '#' },
  { title: 'Exam Timetable', type: 'PDF', file: '#' },
];

let adminStudents = [];

const getCookieValue = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const apiGet = async url => {
  const response = await fetch(url, { method: 'GET', credentials: 'include' });
  const payload = await response.json();
  if (!response.ok) throw payload;
  return payload;
};

const fetchCsrfToken = async () => {
  await fetch('/api/auth/csrf-token', { method: 'GET', credentials: 'include' });
  return getCookieValue('XSRF-TOKEN');
};

const apiSecure = async (method, url, data = {}) => {
  const token = await fetchCsrfToken();
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': token,
    },
    body: JSON.stringify(data),
  });
  const payload = await response.json();
  if (!response.ok) throw payload;
  return payload;
};

const getErrorMessage = error => {
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map(item => item.msg).join('. ');
  }
  return error.message || 'Request failed';
};

const table = (headers, rows) => `
  <table>
    <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
`;

const setTheme = theme => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('portal-theme', theme);
};

const initTheme = () => {
  setTheme(localStorage.getItem('portal-theme') || 'light');
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
};

const initNavigation = () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
      item.classList.add('active');
      document.querySelector(`.panel[data-panel="${item.dataset.panel}"]`)?.classList.add('active');
    });
  });
};

const logout = async () => {
  try {
    await apiSecure('POST', '/api/auth/logout', {});
  } catch (_) {
    // redirect even if the session is already expired
  }
  window.location.href = 'login.html';
};

const gradePoints = grade => {
  const map = { A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2 };
  return map[grade] || 0;
};

const renderStudentCourses = courses => {
  const courseList = document.getElementById('courseList');
  if (!courseList) return;
  courseList.innerHTML = courses.map(course => `
    <article class="info-card">
      <span>${escapeHtml(course.code)}</span>
      <strong>${escapeHtml(course.title)}</strong>
      <p>Grade: ${escapeHtml(course.grade || 'Pending')}</p>
    </article>
  `).join('');
};

const initStudentPage = async () => {
  const profileResp = await apiGet('/api/user/profile');
  const coursesResp = await apiGet('/api/user/courses');
  const profile = profileResp.profile;
  const courses = coursesResp.courses || [];

  if (profile.role !== 'student') {
    window.location.href = 'admin.html';
    return;
  }

  document.getElementById('profileInfo').innerHTML = `
    <div class="avatar">${escapeHtml(profile.name.slice(0, 1).toUpperCase())}</div>
    <div>
      <h3>${escapeHtml(profile.name)}</h3>
      <p>${escapeHtml(profile.email)}</p>
      <span class="pill">Student</span>
    </div>
  `;

  document.getElementById('studentCourseCount').textContent = courses.length;
  const average = courses.length ? (courses.reduce((sum, course) => sum + gradePoints(course.grade), 0) / courses.length).toFixed(2) : '-';
  document.getElementById('studentAverageGrade').textContent = average;

  renderStudentCourses(courses);
  document.getElementById('announcementList').innerHTML = sampleAnnouncements.map(item => `
    <article class="list-item"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p></article>
  `).join('');
  document.getElementById('timetableTable').innerHTML = table(['Day', 'Time', 'Unit', 'Venue'], sampleTimetable.map(row => row.map(escapeHtml)));
  document.getElementById('resultsTable').innerHTML = table(['Code', 'Unit', 'Grade'], courses.map(course => [escapeHtml(course.code), escapeHtml(course.title), escapeHtml(course.grade || 'Pending')]));
  document.getElementById('paymentHistory').innerHTML = table(['Date', 'Reference', 'Amount'], samplePayments.map(row => row.map(escapeHtml)));
  document.getElementById('documentList').innerHTML = sampleDocuments.map(doc => `
    <article class="info-card">
      <span>${escapeHtml(doc.type)}</span>
      <strong>${escapeHtml(doc.title)}</strong>
      <a class="button button-secondary" href="${doc.file}" download>Download</a>
    </article>
  `).join('');

  document.getElementById('passwordForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.getElementById('profileStatus');
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    status.textContent = 'Updating password...';
    try {
      const result = await apiSecure('PUT', '/api/user/password', data);
      status.textContent = result.message;
      status.style.color = '#0f766e';
      event.currentTarget.reset();
    } catch (error) {
      status.textContent = getErrorMessage(error);
      status.style.color = '#dc2626';
    }
  });
};

const renderAdminMetrics = students => {
  const disabled = students.filter(student => student.disabled).length;
  const totalFees = students.length * 36500;
  const pending = students.length * 12500;
  document.getElementById('studentCount').textContent = students.length;
  document.getElementById('disabledCount').textContent = disabled;
  document.getElementById('feesCollected').textContent = `KES ${totalFees.toLocaleString()}`;
  document.getElementById('pendingPayments').textContent = `KES ${pending.toLocaleString()}`;
  document.getElementById('adminChart').innerHTML = [
    ['Students', Math.max(students.length, 1) * 18],
    ['Paid', Math.min(100, students.length * 14 + 32)],
    ['Pending', Math.min(100, students.length * 9 + 20)],
  ].map(([label, height]) => `<div><span style="height:${height}px"></span><p>${label}</p></div>`).join('');
};

const renderStudentTable = students => {
  const rows = students.map(student => [
    escapeHtml(student.name),
    escapeHtml(student.email),
    student.disabled ? '<span class="pill danger">Disabled</span>' : '<span class="pill">Active</span>',
    `<button class="mini-button edit-student" data-id="${escapeHtml(student._id)}">Edit</button>
     <button class="mini-button danger delete-student" data-id="${escapeHtml(student._id)}">Delete</button>
     <button class="mini-button disable-student" data-id="${escapeHtml(student._id)}">Disable</button>`,
  ]);
  document.getElementById('studentList').innerHTML = table(['Name', 'Email', 'Status', 'Actions'], rows);
};

const renderCourseManager = students => {
  document.getElementById('courseManager').innerHTML = students.map(student => `
    <article class="student-card">
      <div class="student-card-header">
        <div><strong>${escapeHtml(student.name)}</strong><p>${escapeHtml(student.email)}</p></div>
        <span class="pill">${(student.courses || []).length} units</span>
      </div>
      <div class="admin-course-list" data-student-id="${escapeHtml(student._id)}">
        ${(student.courses || []).map(course => `
          <div class="course-row">
            <input type="text" class="course-code" value="${escapeHtml(course.code)}" placeholder="Code" />
            <input type="text" class="course-title" value="${escapeHtml(course.title)}" placeholder="Course title" />
            <input type="text" class="course-grade" value="${escapeHtml(course.grade)}" placeholder="Grade" />
          </div>
        `).join('')}
      </div>
      <button class="button button-secondary add-course-btn" data-id="${escapeHtml(student._id)}">Add Unit</button>
      <button class="button save-courses-btn" data-id="${escapeHtml(student._id)}">Save Units</button>
    </article>
  `).join('');
};

const refreshAdmin = async () => {
  const [studentsResp, logsResp] = await Promise.all([
    apiGet('/api/admin/students'),
    apiGet('/api/admin/activity-logs'),
  ]);
  adminStudents = studentsResp.students || [];
  renderAdminMetrics(adminStudents);
  renderStudentTable(adminStudents);
  renderCourseManager(adminStudents);
  document.getElementById('feeRecords').innerHTML = table(['Student', 'Collected', 'Pending'], adminStudents.map(student => [
    escapeHtml(student.name),
    'KES 36,500',
    student.disabled ? 'KES 0' : 'KES 12,500',
  ]));
  document.getElementById('activityLogs').innerHTML = table(['Action', 'Email', 'Result', 'Time'], (logsResp.logs || []).map(log => [
    escapeHtml(log.action),
    escapeHtml(log.email || 'Unknown'),
    log.success ? 'Success' : 'Failed',
    escapeHtml(new Date(log.createdAt).toLocaleString()),
  ]));
};

const initAdminEvents = () => {
  document.getElementById('studentSearch')?.addEventListener('input', event => {
    const query = event.target.value.toLowerCase();
    renderStudentTable(adminStudents.filter(student => `${student.name} ${student.email}`.toLowerCase().includes(query)));
  });

  document.getElementById('studentForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      if (data.id) {
        await apiSecure('PUT', `/api/admin/students/${data.id}`, { name: data.name, email: data.email });
      } else {
        await apiSecure('POST', '/api/admin/students', data);
      }
      form.reset();
      await refreshAdmin();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  });

  document.body.addEventListener('click', async event => {
    const id = event.target.dataset.id;
    if (event.target.classList.contains('edit-student')) {
      const student = adminStudents.find(item => item._id === id);
      const form = document.getElementById('studentForm');
      form.elements.id.value = student._id;
      form.elements.name.value = student.name;
      form.elements.email.value = student.email;
      form.elements.password.value = '';
    }
    if (event.target.classList.contains('delete-student')) {
      await apiSecure('DELETE', `/api/admin/students/${id}`, {});
      await refreshAdmin();
    }
    if (event.target.classList.contains('disable-student')) {
      await apiSecure('PATCH', `/api/admin/disable/${id}`, {});
      await refreshAdmin();
    }
    if (event.target.classList.contains('add-course-btn')) {
      const list = document.querySelector(`.admin-course-list[data-student-id="${id}"]`);
      list.insertAdjacentHTML('beforeend', '<div class="course-row"><input type="text" class="course-code" placeholder="Code" /><input type="text" class="course-title" placeholder="Course title" /><input type="text" class="course-grade" placeholder="Grade" /></div>');
    }
    if (event.target.classList.contains('save-courses-btn')) {
      const list = document.querySelector(`.admin-course-list[data-student-id="${id}"]`);
      const courses = [...list.querySelectorAll('.course-row')].map(row => ({
        code: row.querySelector('.course-code').value,
        title: row.querySelector('.course-title').value,
        grade: row.querySelector('.course-grade').value,
      }));
      await apiSecure('PUT', `/api/admin/students/${id}/courses`, { courses });
      await refreshAdmin();
    }
  });

  document.getElementById('announcementForm')?.addEventListener('submit', event => {
    event.preventDefault();
    document.getElementById('announcementStatus').textContent = 'Announcement sent to students';
    event.currentTarget.reset();
  });
};

const initAdminPage = async () => {
  await refreshAdmin();
  initAdminEvents();
};

const init = async () => {
  initTheme();
  initNavigation();
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  try {
    if (page === 'student') await initStudentPage();
    if (page === 'admin') await initAdminPage();
  } catch (error) {
    window.location.href = 'login.html';
  }
};

init();
