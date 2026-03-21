# Database Documentation

## Tables

### users
Stores user account information.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Unique user identifier
- `email` (VARCHAR, UNIQUE) - User's email address
- `password_hash` (VARCHAR) - Hashed password (bcrypt)
- `username` (VARCHAR) - Optional display name
- `created_at` (TIMESTAMP) - Account creation date
- `updated_at` (TIMESTAMP) - Last update time

### places
Stores information about travel destinations/places.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Unique place identifier
- `name` (VARCHAR) - Place name
- `city` (VARCHAR) - City location
- `category` (VARCHAR) - Type (restaurant, museum, bar, etc.)
- `subcategory` (VARCHAR) - More specific type
- `price_level` (INTEGER 1-4) - Price range
- `latitude` (DECIMAL) - GPS latitude
- `longitude` (DECIMAL) - GPS longitude
- `address` (TEXT) - Full address
- `description` (TEXT) - Place description
- `average_rating` (DECIMAL) - Average user rating
- `total_ratings` (INTEGER) - Number of ratings
- `image_url` (TEXT) - Image URL
- `created_at` (TIMESTAMP) - When added to database

### user_interactions
Tracks user actions (ratings, favorites, visits).

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Unique interaction ID
- `user_id` (INTEGER FK) - References users(id)
- `place_id` (INTEGER FK) - References places(id)
- `interaction_type` (VARCHAR) - 'rating', 'favorite', or 'visited'
- `rating_value` (INTEGER 1-5) - Rating if type is 'rating'
- `created_at` (TIMESTAMP) - When interaction occurred

**Constraints:**
- UNIQUE(user_id, place_id, interaction_type) - One of each interaction type per user-place pair

### user_preferences
Stores explicit user preferences.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Unique preference ID
- `user_id` (INTEGER FK, UNIQUE) - References users(id)
- `preferred_categories` (JSONB) - Array of preferred categories
- `preferred_price_range` (JSONB) - Object with min/max price
- `interests` (TEXT[]) - Array of interest keywords
- `updated_at` (TIMESTAMP) - Last update time

## Setup

To initialize the database:
```bash
# Option 1: Using psql
psql -U postgres -d travel_app -f src/database/schema.sql


## Testing

To test the database connection:
```bash
node src/database/testConnection.js
```
```

---

## **✅ WEEK 2 COMPLETE CHECKLIST:**

After completing these steps, you should have:

- ✅ `travel_app` database created in PostgreSQL
- ✅ Four tables created: users, places, user_interactions, user_preferences
- ✅ `schema.sql` file with complete database structure
- ✅ Improved `database.js` with error handling
- ✅ Database helper functions in `helpers.js`
- ✅ Test utilities to verify everything works
- ✅ Server showing database connection on startup
- ✅ Test endpoints working (`/api/test-db`, `/api/users`)
- ✅ Database documentation written

---

## **Your Updated Folder Structure:**
```
backend/
├── src/
│   ├── config/
│   │   └── database.js           ✅ Updated with better connection
│   ├── database/
│   │   ├── schema.sql            ✅ Complete database schema
│   │   ├── initDatabase.js       ✅ Script to initialize DB
│   │   ├── testConnection.js     ✅ Script to test DB
│   │   ├── helpers.js            ✅ Database helper functions
│   │   └── README.md             ✅ Database documentation
│   ├── routes/                   (empty - Week 3)
│   ├── controllers/              (empty - Week 3)
│   ├── middleware/               (empty - Week 3)
│   └── server.js                 ✅ Updated with better routes
├── .env                          ✅ Environment variables
├── .gitignore                    ✅ Git ignore file
├── package.json                  ✅ Dependencies
└── node_modules/                 ✅ Installed packages