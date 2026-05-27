// Builds a taste profile for a user based on everything they've interacted with
// This profile is used by the recommendation system to decide what to suggest
// It looks at ratings, favorites, and visited places — then works out:
//    Which categories this user tends to enjoy
//    Which price levels they gravitate toward
//    How many interactions they have (used to decide how much to rely on ML vs preferences)
//    Which place IDs to exclude from recommendations (already seen)

const db = require('../config/database');

// How much each interaction type is worth as a preference score (out of 5)
const INTERACTION_SCORES = {
  rating:   null,  
  favorite: 4.0,
  visited:  3.0,
};

// Recent interactions carry more weight than old ones
// A 4-star rating from last week is more useful than one from a year ago
function recencyWeight(createdAt) {
  const daysAgo = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 30)  return 1.0;
  if (daysAgo <= 90)  return 0.8;
  if (daysAgo <= 180) return 0.6;
  return 0.4;
}

// Pull all of the user's interactions, joined with place details so we know category and price level
async function fetchUserInteractions(userId) {
  const result = await db.query(`
    SELECT
      ui.place_id,
      ui.interaction_type,
      ui.rating_value,
      ui.created_at,
      p.category,
      p.price_level
    FROM user_interactions ui
    JOIN places p ON ui.place_id = p.id
    WHERE ui.user_id = $1
  `, [userId]);
  return result.rows;
}

// Combine multiple interactions for the same place into one preference score
// e.g. if a user rated a place 5 AND favorited it, that's a stronger signal than just a rating
function resolveScore(interactions) {
  const hasRating   = interactions.find(i => i.interaction_type === 'rating');
  const hasFavorite = interactions.find(i => i.interaction_type === 'favorite');

  let score = INTERACTION_SCORES.visited; // default if only visited

  if (hasRating) {
    score = hasRating.rating_value;
    if (hasFavorite) score = Math.min(score + 0.5, 5); // rating + favorite = boost
  } else if (hasFavorite) {
    score = INTERACTION_SCORES.favorite;
  }

  // Use the most recent interaction's date for recency weighting
  const mostRecent = interactions.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  );

  return score * recencyWeight(mostRecent.created_at);
}

// Average a list of weighted scores and normalize to a 0–1 scale
function normalizeScores(scoreMap) {
  const max = Math.max(...Object.values(scoreMap), 1);
  const normalized = {};
  for (const [key, val] of Object.entries(scoreMap)) {
    normalized[key] = parseFloat((val / max).toFixed(3));
  }
  return normalized;
}

async function buildUserProfile(userId) {
  const interactions = await fetchUserInteractions(userId);

  // Group all interactions by place so we can combine them into one score per place
  const byPlace = {};
  for (const row of interactions) {
    if (!byPlace[row.place_id]) byPlace[row.place_id] = [];
    byPlace[row.place_id].push(row);
  }

  const categoryScores  = {};
  const priceLevelScores = {};
  const interactedPlaceIds = Object.keys(byPlace).map(Number);

  // For each place the user interacted with, work out their preference score
  // then add it to the running totals for that category and price level
  for (const [placeId, placeInteractions] of Object.entries(byPlace)) {
    const score    = resolveScore(placeInteractions);
    const category = placeInteractions[0].category;
    const price    = placeInteractions[0].price_level;

    if (category) {
      if (!categoryScores[category]) categoryScores[category] = { total: 0, count: 0 };
      categoryScores[category].total += score;
      categoryScores[category].count += 1;
    }

    if (price) {
      if (!priceLevelScores[price]) priceLevelScores[price] = { total: 0, count: 0 };
      priceLevelScores[price].total += score;
      priceLevelScores[price].count += 1;
    }
  }

  // Convert totals into averages for each category and price level
  const categoryAverages  = {};
  const categoryCounts    = {};
  for (const [cat, data] of Object.entries(categoryScores)) {
    categoryAverages[cat] = data.total / data.count;
    categoryCounts[cat]   = data.count;
  }

  const priceLevelAverages = {};
  for (const [price, data] of Object.entries(priceLevelScores)) {
    priceLevelAverages[price] = data.total / data.count;
  }

  return {
    categoryAffinities:   normalizeScores(categoryAverages),
    categoryCounts,
    priceLevelAffinities: normalizeScores(priceLevelAverages),
    interactionCount:     interactedPlaceIds.length,
    interactedPlaceIds,
  };
}

module.exports = { buildUserProfile };
