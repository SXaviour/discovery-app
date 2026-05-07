// Content-based scoring algorithm
// Scores every unseen place for a given user based on how well it matches their tastes
// Each place gets a score from 0–1 based on three things:
//    Category match  (40%) — does this user tend to enjoy this type of place?
//    Price match     (15%) — is this place in their usual spending range?
//    Google rating + User   (30%) — is the place actually well regarded?
//    Popularity      (15%) — how popular is the place?
// The category and price scores come from either:
//    Behavioral profile  (if the user has 5+ interactions) — learned from what they've actually done
//    Explicit preferences (if the user is new) — what they said they like when they signed up

const db = require('../config/database');
const { buildUserProfile } = require('./userProfile');
const { getPreferences }   = require('../database/preferencesHelpers');

// How many interactions a user needs before we trust behavioral data over stated preferences
const COLD_START_THRESHOLD = 5;

// How much each factor contributes to the final score
const WEIGHTS = {
  category:   0.50,
  quality:    0.30, // blended rating from Google + our users
  popularity: 0.20, // how many people have reviewed it
};

// Fetch all places the user hasn't interacted with yet
// The excludeIds list comes from the user's profile so we never recommend something they've already seen
async function getCandidatePlaces(excludeIds, city) {
  const conditions = ['p.is_closed = false'];
  const values = [];
  let i = 1;

  if (excludeIds.length > 0) {
    conditions.push(`p.id != ALL($${i++})`);
    values.push(excludeIds);
  }

  if (city) {
    conditions.push(`p.city = $${i++}`);
    values.push(city);
  }

  // Join in favorite and visited counts from our own users
  // These are left joins so places with zero interactions still appear
  const result = await db.query(`
    SELECT
      p.id, p.name, p.city, p.category, p.subcategory, p.address,
      p.google_rating, p.google_review_count, p.average_rating, p.total_ratings,
      p.price_level, p.image_url, p.description,
      COALESCE(fav.count, 0) AS favorite_count,
      COALESCE(vis.count, 0) AS visited_count
    FROM places p
    LEFT JOIN (
      SELECT place_id, COUNT(*) AS count
      FROM user_interactions
      WHERE interaction_type = 'favorite'
      GROUP BY place_id
    ) fav ON fav.place_id = p.id
    LEFT JOIN (
      SELECT place_id, COUNT(*) AS count
      FROM user_interactions
      WHERE interaction_type = 'visited'
      GROUP BY place_id
    ) vis ON vis.place_id = p.id
    WHERE ${conditions.join(' AND ')}
  `, values);

  return result.rows;
}

// Blends Google's rating with our own users' average rating into one quality score
// If both exist, Google's carries more weight since it has far more data behind it
// If only one exists, use that alone. If neither, default to a neutral 0.5
function qualityScore(place) {
  const google = place.google_rating;
  const ours   = place.average_rating && place.total_ratings > 0 ? place.average_rating : null;

  if (google && ours) return (google * 0.6 + ours * 0.4) / 5;
  if (google)         return google / 5;
  if (ours)           return ours / 5;
  return 0.5;
}

// Combines three signals into one popularity score:
//    Google review count  (external — many people globally reviewed it)
//    Favorite count       (our users saved it)
//    Visited count        (our users physically went)
// Google carries more weight (70%) since our app is still new and has fewer users
function popularityScore(place) {
  const googleCount   = place.google_review_count || 0;
  const internalCount = (Number(place.favorite_count) || 0) + (Number(place.visited_count) || 0);

  const externalScore = Math.min(Math.log10(googleCount   + 1) / Math.log10(1000), 1);
  const internalScore = Math.min(Math.log10(internalCount + 1) / Math.log10(50),   1); // smaller scale — 50 interactions = max

  return externalScore * 0.7 + internalScore * 0.3;
}

// Score one place for a user based on their category affinities
function scorePlaceBehavioral(place, categoryAffinities) {
  const categoryScore = categoryAffinities[place.category] ?? 0.1;

  return (
    categoryScore          * WEIGHTS.category   +
    qualityScore(place)    * WEIGHTS.quality    +
    popularityScore(place) * WEIGHTS.popularity
  );
}

// Score one place for a new user based on what they said they prefer
function scorePlaceColdStart(place, preferredCategories) {
  const inCategory    = preferredCategories.length === 0 || preferredCategories.includes(place.category);
  const categoryScore = inCategory ? 1.0 : 0.2;

  return (
    categoryScore          * WEIGHTS.category   +
    qualityScore(place)    * WEIGHTS.quality    +
    popularityScore(place) * WEIGHTS.popularity
  );
}

async function getContentBasedRecommendations(userId, { city, limit = 20 } = {}) {
  // Build the user's behavioral profile from their interaction history
  const profile = await buildUserProfile(userId);

  // Decide whether to use behavioral data or fall back to stated preferences
  const useBehavioral = profile.interactionCount >= COLD_START_THRESHOLD;

  // Fetch candidates — all places the user hasn't touched yet
  const candidates = await getCandidatePlaces(profile.interactedPlaceIds, city);

  let scored;

  if (useBehavioral) {
    scored = candidates.map(place => ({
      ...place,
      score: parseFloat(scorePlaceBehavioral(place, profile.categoryAffinities).toFixed(4)),
    }));
  } else {
    const prefs = await getPreferences(userId);
    const preferredCategories = prefs?.preferred_categories || [];

    scored = candidates.map(place => ({
      ...place,
      score: parseFloat(scorePlaceColdStart(place, preferredCategories).toFixed(4)),
    }));
  }

  // Sort highest score first, return top N
  scored.sort((a, b) => b.score - a.score);

  return {
    recommendations: scored.slice(0, limit),
    meta: {
      mode:             useBehavioral ? 'behavioral' : 'cold_start',
      interactionCount: profile.interactionCount,
      totalCandidates:  candidates.length,
    },
  };
}

// Exposed separately so the hybrid scorer can get raw content scores
// without the final sort/slice, then blend them with NCF predictions
async function scoreAllCandidates(userId, { city } = {}) {
  const profile = await buildUserProfile(userId);
  const useBehavioral = profile.interactionCount >= COLD_START_THRESHOLD;
  const candidates = await getCandidatePlaces(profile.interactedPlaceIds, city);

  let scored;

  if (useBehavioral) {
    scored = candidates.map(place => ({
      ...place,
      contentScore: parseFloat(scorePlaceBehavioral(place, profile.categoryAffinities).toFixed(4)),
    }));
  } else {
    const prefs = await getPreferences(userId);
    const preferredCategories = prefs?.preferred_categories || [];

    scored = candidates.map(place => ({
      ...place,
      contentScore: parseFloat(scorePlaceColdStart(place, preferredCategories).toFixed(4)),
    }));
  }

  return {
    scored,
    meta: {
      mode: useBehavioral ? 'behavioral' : 'cold_start',
      interactionCount: profile.interactionCount,
      totalCandidates: candidates.length,
    },
  };
}

module.exports = { getContentBasedRecommendations, scoreAllCandidates };
