const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const db = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const placesRoutes = require('./routes/placesRoutes');
const interactionsRoutes      = require('./routes/interactionsRoutes');
const preferencesRoutes       = require('./routes/preferencesRoutes');
const recommendationsRoutes   = require('./routes/recommendationsRoutes');
const collectionsRoutes       = require('./routes/collectionsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;


// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

// Allow requests from the React frontend (localhost:3000 during development)
// credentials: true is required so the browser sends session cookies cross-origin
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Parse incoming JSON request bodies (so we can read req.body)
app.use(express.json());

// Session middleware — must come before any routes that use req.session
// How sessions work:
//   1. On first request, express-session creates a unique session ID
//   2. That ID is sent to the browser as a cookie called "connect.sid"
//   3. On every future request, the browser sends that cookie back
//   4. express-session uses the ID to look up the session data on the server
//   5. We store userId in the session when the user logs in
app.use(session({
  secret: process.env.SESSION_SECRET,  // Used to sign the cookie to prevent tampering
  resave: false,                        // Don't save session if it wasn't modified
  saveUninitialized: false,             // Don't create a session until something is stored
  cookie: {
    httpOnly: true,    // Cookie can't be accessed by JavaScript (XSS protection)
    secure: false,     // Set to true in production when using HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7   // Session lasts 7 days (in milliseconds)
  }
}));


// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Mount all auth routes at /api
// So: POST /api/auth/register, POST /api/auth/login, etc.
app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/interactions',    interactionsRoutes);
app.use('/api/preferences',    preferencesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/collections',     collectionsRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({
    message: 'Travel App API',
    status: 'running',
    version: '1.0.0'
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database connection test
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
    res.json({
      success: true,
      database_time: result.rows[0].current_time,
      user_count: result.rows[0].user_count,
      message: 'Database connection successful!'
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ─── ERROR HANDLING ───────────────────────────────────────────────────────────

// 404 — catches any request that didn't match a route above
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// 500 — catches any error passed via next(err) from a route
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
   Travel App API Server Running
   URL:         http://localhost:${PORT}
   Environment: ${process.env.NODE_ENV}

   Auth endpoints:
     POST http://localhost:${PORT}/api/auth/register
     POST http://localhost:${PORT}/api/auth/login
     POST http://localhost:${PORT}/api/auth/logout
     GET  http://localhost:${PORT}/api/auth/me

   Press Ctrl+C to stop
  `);
});

// Shutdown when Ctrl+C is pressed
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await db.end();
  process.exit(0);
});
