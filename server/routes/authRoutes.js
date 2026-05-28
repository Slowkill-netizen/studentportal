const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const csrf = require('csurf');
const { authLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');

const csrfProtection = csrf({ cookie: true });
const router = express.Router();

router.post(
  '/register',
  authLimiter,
  csrfProtection,
  body('name').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters').escape(),
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must include a number')
    .matches(/[@$!%*?&#]/).withMessage('Password must include one symbol: @$!%*?&#'),
  body('role').isIn(['student', 'admin']).withMessage('Choose Student or Admin'),
  body('adminCode').optional({ checkFalsy: true }).trim(),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authLimiter,
  csrfProtection,
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').trim(),
  body('role').isIn(['student', 'admin']).withMessage('Choose Student or Admin'),
  asyncHandler(authController.login)
);

router.post('/verify-otp', csrfProtection, body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric().withMessage('OTP must contain only numbers'), asyncHandler(authController.verifyOtp));
router.post('/logout', csrfProtection, asyncHandler(authController.logout));
router.post('/forgot-password', csrfProtection, body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(), asyncHandler(authController.forgotPassword));
router.post(
  '/reset-password',
  csrfProtection,
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must include a number')
    .matches(/[@$!%*?&#]/).withMessage('Password must include one symbol: @$!%*?&#'),
  asyncHandler(authController.resetPassword)
);

module.exports = router;
