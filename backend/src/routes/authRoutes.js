const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authControllers');

// POST /api/auth/register  — create a new account
router.post('/register', register);

// POST /api/auth/login     — log in and start a session
router.post('/login', login);

// POST /api/auth/logout    — end the session
router.post('/logout', logout);

// GET  /api/auth/me        — get the currently logged-in user
router.get('/me', getMe);

module.exports = router;
