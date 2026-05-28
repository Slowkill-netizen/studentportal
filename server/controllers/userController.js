const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  delete user.password;
  delete user.otpHash;
  delete user.resetTokenHash;
  res.json({ profile: user });
};

exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const updates = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.email) updates.email = req.body.email;

  const user = await User.findByIdAndUpdate(req.user.id, updates);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  delete user.password;
  delete user.otpHash;
  delete user.resetTokenHash;
  res.json({ profile: user, message: 'Profile updated successfully' });
};

exports.getCourses = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ courses: user.courses });
};

exports.getGrades = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ grades: user.courses.map(course => ({ code: course.code, title: course.title, grade: course.grade })) });
};

exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ message: 'Password changed successfully' });
};
