const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateMe, changePassword, deleteMe } = require('../controllers/authControllers');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login',    login);
router.post('/logout',   logout);
router.get('/me',        getMe);

// Settings endpoints — all require authentication
router.patch('/me',             requireAuth, updateMe);
router.post('/change-password', requireAuth, changePassword);
router.delete('/me',            requireAuth, deleteMe);

module.exports = router;
