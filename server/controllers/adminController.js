const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

function sanitizeStudent(student) {
  delete student.password;
  delete student.otpHash;
  delete student.resetTokenHash;
  return student;
}

exports.getStudents = async (req, res) => {
  const students = (await User.find({ role: 'student' })).map(sanitizeStudent);
  res.json({ students });
};

exports.getActivityLogs = async (req, res) => {
  const logs = await ActivityLog.latest(100);
  res.json({ logs });
};

exports.disableStudent = async (req, res) => {
  const studentId = req.params.id;
  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ message: 'Invalid student ID' });
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found' });
  }

  student.disabled = true;
  await student.save();
  res.json({ message: 'Student account disabled successfully' });
};

exports.createStudent = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const student = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: 'student',
    courses: [],
  });

  res.status(201).json({ message: 'Student added successfully', student: sanitizeStudent(student) });
};

exports.updateStudent = async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found' });
  }

  if (req.body.name !== undefined) student.name = String(req.body.name).trim();
  if (req.body.email !== undefined) student.email = String(req.body.email).trim().toLowerCase();
  if (req.body.disabled !== undefined) student.disabled = Boolean(req.body.disabled);
  await student.save();

  res.json({ message: 'Student updated successfully', student: sanitizeStudent(student) });
};

exports.deleteStudent = async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found' });
  }

  await User.deleteById(req.params.id);
  res.json({ message: 'Student deleted successfully' });
};

exports.updateStudentCourses = async (req, res) => {
  const studentId = req.params.id;
  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ message: 'Invalid student ID' });
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found' });
  }

  const courses = Array.isArray(req.body.courses) ? req.body.courses : [];
  student.courses = courses
    .map(course => ({
      code: String(course.code || '').trim().toUpperCase(),
      title: String(course.title || '').trim(),
      grade: String(course.grade || '').trim().toUpperCase(),
    }))
    .filter(course => course.code && course.title);

  await student.save();
  res.json({ message: 'Courses updated successfully', courses: student.courses });
};
