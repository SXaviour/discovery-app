const express = require('express');
const cors = require('cors');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
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
const isProd = process.env.NODE_ENV === 'production';


// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

// In production the frontend is served from the same origin, so CORS is only
// needed in development (where React dev server runs on a different port)
if (!isProd) {
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
}

app.use(express.json());

// Sessions stored in Postgres so they survive server restarts
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,   // HTTPS only in production
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));


// ─── API ROUTES ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/interactions',    interactionsRoutes);
app.use('/api/preferences',    preferencesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/collections',     collectionsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
    res.json({
      success: true,
      database_time: result.rows[0].current_time,
      user_count: result.rows[0].user_count,
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ─── STATIC FILES (production) ───────────────────────────────────────────────

// Serve the built React app for all non-API routes
// path resolves to <repo-root>/frontend/build relative to this file's location
const clientBuild = path.join(__dirname, '../../frontend/build');
app.use(express.static(clientBuild));

// Any route that isn't an API call gets the React index.html so React Router works
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});


// ─── ERROR HANDLING ───────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: isProd ? undefined : err.message
  });
});


// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

process.on('SIGINT', async () => {
  await db.end();
  process.exit(0);
});
