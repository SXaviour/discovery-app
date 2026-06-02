// This file handles connecting to the PostgreSQL database and provides a query interface for the rest of the app.

const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection fails
});

// Log when a new client connects
pool.on('connect', () => {
  console.log('✅ New client connected to database');
});

// Log any errors that occur
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client', err);
  process.exit(-1);
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
  }
});

// Export query function
module.exports = {
  
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  
  // Close all connections
  end: () => pool.end(),
};