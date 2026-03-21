
-- USERS TABLE

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups used during login and registration
CREATE INDEX idx_users_email ON users(email);

-- PLACES TABLE
CREATE TABLE places (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  description TEXT,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_places_city ON places(city);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_rating ON places(average_rating DESC);


-- USER INTERACTIONS TABLE (ratings, favorites, visited)
CREATE TABLE user_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('rating', 'favorite', 'visited')),
  rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, place_id, interaction_type)
);

-- Indexes for faster lookups
CREATE INDEX idx_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_interactions_place ON user_interactions(place_id);
CREATE INDEX idx_interactions_type ON user_interactions(interaction_type);


-- USER PREFERENCES TABLE
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preferred_categories JSONB DEFAULT '[]',
  preferred_price_range JSONB DEFAULT '{"min": 1, "max": 4}',
  interests TEXT[],
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for user lookups
CREATE INDEX idx_preferences_user ON user_preferences(user_id);


-- SAMPLE DATA (Optional - for testing)

-- Insert a test user (password is 'password123' hashed with bcrypt)
-- Note: This is a fake hash. bcrypt hash will be use later.
INSERT INTO users (email, password_hash, username) 
VALUES (
  'test@example.com', 
  '$2b$10$rQ4ZqJ5lJ5lJ5lJ5lJ5lJuN5lJ5lJ5lJ5lJ5lJ5lJ5lJ5lJ5lJ5lJ', 
  'testuser'
);

