const db = require('../config/database');

//Database helper functions for common operations
 
// Find a user by email
async function findUserByEmail(email) {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

// Find a user by ID
async function findUserById(id) {
  const result = await db.query(
    'SELECT id, email, username, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

// Create a new user
async function createUser(email, passwordHash, username = null) {
  const result = await db.query(
    `INSERT INTO users (email, password_hash, username, created_at, updated_at) 
     VALUES ($1, $2, $3, NOW(), NOW()) 
     RETURNING id, email, username, created_at`,
    [email, passwordHash, username]
  );
  return result.rows[0];
}

// Update user's last login time
async function updateUserLastLogin(userId) {
  await db.query(
    'UPDATE users SET updated_at = NOW() WHERE id = $1',
    [userId]
  );
}

// Get all users (for admin/testing)
async function getAllUsers() {
  const result = await db.query(
    'SELECT id, email, username, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

// Delete a user and all their data due to CASCADE
async function deleteUser(userId) {
  const result = await db.query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [userId]
  );
  return result.rowCount > 0;
}

// Check if email exists
async function emailExists(email) {
  const result = await db.query(
    'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)',
    [email]
  );
  return result.rows[0].exists;
}

// Get the stored bcrypt hash for a user (used when verifying current password before changes)
async function getUserPasswordHash(userId) {
  const result = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.password_hash || null;
}

// Update the username for a user
async function updateUsername(userId, username) {
  const result = await db.query(
    'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, username',
    [username, userId]
  );
  return result.rows[0] || null;
}

// Replace the stored password hash (called after verifying the old password)
async function updatePassword(userId, passwordHash) {
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, userId]
  );
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserLastLogin,
  getAllUsers,
  deleteUser,
  emailExists,
  getUserPasswordHash,
  updateUsername,
  updatePassword,
};