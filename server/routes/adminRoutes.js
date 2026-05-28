const express = require('express');
const csrf = require('csurf');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const csrfProtection = csrf({ cookie: true });
router.use(authMiddleware.protect);
router.use(roleMiddleware.restrictTo('admin'));

router.get('/students', asyncHandler(adminController.getStudents));
router.post('/students', csrfProtection, asyncHandler(adminController.createStudent));
router.put('/students/:id', csrfProtection, asyncHandler(adminController.updateStudent));
router.delete('/students/:id', csrfProtection, asyncHandler(adminController.deleteStudent));
router.get('/activity-logs', asyncHandler(adminController.getActivityLogs));
router.patch('/disable/:id', csrfProtection, asyncHandler(adminController.disableStudent));
router.put('/students/:id/courses', csrfProtection, asyncHandler(adminController.updateStudentCourses));

module.exports = router;
