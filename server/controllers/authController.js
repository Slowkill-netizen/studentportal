const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const mailService = require('../services/mailService');
const { generateOtp, hashToken, generateJwt } = require('../utils/token');

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 5;
const RESET_EXPIRES_MINUTES = parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES, 10) || 15;

function validationErrorResponse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return true;
  }
  return false;
}

function logActivity(user, action, success, req) {
  return ActivityLog.create({
    user: user ? user._id : null,
    email: user ? user.email : null,
    action,
    success,
    ip: req.ip,
  });
}

exports.register = async (req, res) => {
  if (validationErrorResponse(req, res)) return;

  const { name, email, password, role = 'student', adminCode } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  if (role === 'admin') {
    if (!process.env.ADMIN_REGISTRATION_CODE) {
      return res.status(403).json({ message: 'Admin registration is not configured' });
    }
    if (adminCode !== process.env.ADMIN_REGISTRATION_CODE) {
      return res.status(403).json({ message: 'Invalid admin registration code' });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    courses: role === 'student' ? [
      { code: 'ENG101', title: 'English Composition', grade: 'A' },
      { code: 'CS202', title: 'Computer Science', grade: 'A-' },
    ] : [],
  });

  await logActivity(user, 'register', true, req);
  res.status(201).json({ message: 'Registration successful. Please login to continue.' });
};

exports.login = async (req, res) => {
  if (validationErrorResponse(req, res)) return;

  const { email, password, role } = req.body;
  const user = await User.findOne({ email });
  const noUser = !user;
  if (noUser) {
    await logActivity(null, 'login_attempt', false, req);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.disabled) {
    return res.status(403).json({ message: 'Account is disabled. Contact support.' });
  }

  if (role && user.role !== role) {
    await logActivity(user, 'login_attempt', false, req);
    return res.status(403).json({ message: `This account is not registered as ${role}` });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    user.loginAttempts += 1;
    await user.save();
    await logActivity(user, 'login_attempt', false, req);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const otp = generateOtp();
  user.otpHash = await bcrypt.hash(otp, 12);
  user.otpExpires = Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000;
  user.loginAttempts = 0;
  await user.save();

  await mailService.sendOtpEmail(user.email, user.name, otp);
  await logActivity(user, 'mfa_sent', true, req);

  const tempToken = generateJwt({ id: user._id, role: user.role, type: 'otp' }, '10m');
  res.cookie('otpToken', tempToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 10 * 60 * 1000,
  });

  res.json({ message: 'OTP sent to your email. Please verify to continue.' });
};

exports.verifyOtp = async (req, res) => {
  if (validationErrorResponse(req, res)) return;

  const { otp } = req.body;
  const token = req.cookies.otpToken;
  if (!token) {
    return res.status(401).json({ message: 'OTP session missing' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'otp') {
      throw new Error('Invalid token type');
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid OTP session' });
    }

    if (!user.otpHash || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP expired or invalid' });
    }

    const isValidOtp = await bcrypt.compare(otp, user.otpHash);
    if (!isValidOtp) {
      await logActivity(user, 'mfa_verify', false, req);
      return res.status(401).json({ message: 'Incorrect OTP' });
    }

    user.otpHash = undefined;
    user.otpExpires = undefined;
    await user.save();
    await logActivity(user, 'mfa_verify', true, req);

    const authToken = generateJwt({ id: user._id, role: user.role }, process.env.JWT_EXPIRES_IN || '1h');
    res.cookie('token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });
    res.clearCookie('otpToken');

    res.json({ message: 'Authentication successful', role: user.role });
  } catch (error) {
    return res.status(401).json({ message: 'OTP verification failed' });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('token');
  res.clearCookie('otpToken');
  res.json({ message: 'Logged out successfully' });
};

exports.forgotPassword = async (req, res) => {
  if (validationErrorResponse(req, res)) return;

  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({ message: 'If your account exists, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = hashToken(resetToken);
  user.resetTokenExpires = Date.now() + RESET_EXPIRES_MINUTES * 60 * 1000;
  await user.save();

  await mailService.sendResetEmail(user.email, user.name, resetToken);
  res.json({ message: 'Password reset link sent to your email.' });
};

exports.resetPassword = async (req, res) => {
  if (validationErrorResponse(req, res)) return;

  const { token, password } = req.body;
  const hashed = hashToken(token);
  const user = await User.findOne({ resetTokenHash: hashed, resetTokenExpires: { $gt: Date.now() } });
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful. You may login again.' });
};
