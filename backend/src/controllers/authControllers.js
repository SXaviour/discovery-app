const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {
  findUserByEmail, findUserById, createUser, updateUserLastLogin, emailExists,
  getUserPasswordHash, updateUsername, updatePassword, deleteUser,
  createResetToken, findValidResetToken, deleteResetToken,
} = require('../database/helpers');
const { sendPasswordResetEmail } = require('../utils/emailService');


// REGISTER 
// Creates a new user account
// POST /api/auth/register
// Body: { email, password, username }

async function register(req, res) {
  try {
    const { email, password, username } = req.body;

    // 1. Make sure email and password were actually sent
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // 2. Basic email format check (must contain @ and a dot after it)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // 3. Password must be at least 6 characters
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // 4. Check if email is already taken
    const alreadyExists = await emailExists(email);
    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // 5. Hash the password (bcrypt adds a random "salt" automatically)
    //    saltRounds=10 means it runs 2^10 = 1024 hashing rounds — slow enough to be secure
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Save the new user to the database
    const newUser = await createUser(email, passwordHash, username || null);

    // 7. Start a session so the user is immediately logged in after registering
    req.session.userId = newUser.id;

    // 8. Respond with the new user's info (never send the password hash back!)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
}


// LOGIN 
// Checks credentials and starts a session
// POST /api/auth/login
// Body: { email, password }

async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;

    // 1. Require both fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // 2. Look up the user by email
    const user = await findUserByEmail(email);

    // 3. If no user found, return a vague error (don't reveal which field is wrong)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 4. Compare the submitted password against the stored hash
    //    bcrypt.compare returns true/false
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 5. Record the login time
    await updateUserLastLogin(user.id);

    // 6. Store the user's ID in their session so we know they're logged in on future requests
    req.session.userId = user.id;
    req.session.cookie.maxAge = rememberMe
      ? 1000 * 60 * 60 * 24 * 30  // 30 days
      : null;                       

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
}


// LOGOUT 
// Destroys the session and clears the cookie
// POST /api/auth/logout

async function logout(req, res) {
  // req.session.destroy() removes the session data from the server
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        error: 'Could not log out, please try again'
      });
    }

    // Also clear the session cookie from the browser
    res.clearCookie('connect.sid');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
}


// GET ME
// Returns the currently logged-in user's info
// GET /api/auth/me

async function getMe(req, res) {
  try {
    // Check if a session exists with a userId
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please log in.'
      });
    }

    // Fetch fresh user data from the database using the session's userId
    const user = await findUserById(req.session.userId);

    if (!user) {
      // Session exists but user was deleted from DB — clear the broken session
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}


// PATCH /api/auth/me
// Updates the logged-in user's username
async function updateMe(req, res) {
  try {
    const { username } = req.body;
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Username cannot be empty' });
    }
    if (username.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'Username must be 50 characters or less' });
    }
    const updated = await updateUsername(req.session.userId, username.trim());
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('updateMe error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
}

// POST /api/auth/change-password
// Verifies the current password then sets a new one
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }
    const hash = await getUserPasswordHash(req.session.userId);
    if (!hash) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const match = await bcrypt.compare(currentPassword, hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await updatePassword(req.session.userId, newHash);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
}

// DELETE /api/auth/me
// Verifies password then permanently deletes the account and all its data
async function deleteMe(req, res) {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required to delete account' });
    }
    const hash = await getUserPasswordHash(req.session.userId);
    if (!hash) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const match = await bcrypt.compare(password, hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }
    await deleteUser(req.session.userId);
    req.session.destroy(() => {});
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('deleteMe error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
}

// POST /api/auth/forgot-password
// Generates a reset token and sends a reset link to the user's email.
// Always returns 200 so we don't reveal whether an email is registered.
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await findUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await createResetToken(user.id, token);
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({ success: true, message: 'If that email is registered, a reset link is on its way.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

// POST /api/auth/reset-password
// Validates the token, sets the new password, then deletes the token.
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

    const userId = await findValidResetToken(token);
    if (!userId) return res.status(400).json({ success: false, error: 'This reset link is invalid or has expired.' });

    const hash = await bcrypt.hash(password, 10);
    await updatePassword(userId, hash);
    await deleteResetToken(token);

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = { register, login, logout, getMe, updateMe, changePassword, deleteMe, forgotPassword, resetPassword };
