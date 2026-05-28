const express = require('express');
const { body } = require('express-validator');
const csrf = require('csurf');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();

const csrfProtection = csrf({ cookie: true });
router.use(authMiddleware.protect);

router.get('/profile', asyncHandler(userController.getProfile));
router.get('/courses', asyncHandler(userController.getCourses));
router.get('/grades', asyncHandler(userController.getGrades));
router.put(
  '/password',
  csrfProtection,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must include an uppercase letter')
    .matches(/[a-z]/).withMessage('New password must include a lowercase letter')
    .matches(/[0-9]/).withMessage('New password must include a number')
    .matches(/[@$!%*?&#]/).withMessage('New password must include one symbol: @$!%*?&#'),
  asyncHandler(userController.changePassword)
);

module.exports = router;
