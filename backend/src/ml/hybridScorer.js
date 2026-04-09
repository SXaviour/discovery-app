// Hybrid recommendation scorer
// Blends two signals for each candidate place:
//   1. Content-based score — does this place match the user's category/price preferences?
//   2. NCF collaborative score — do users with similar taste patterns enjoy this place?
// Inspired by Netflix's approach: "not one algorithm, but a collection"
//
// If the user isn't in the trained model (new user), falls back to content-only scoring

const tf   = require('@tensorflow/tfjs');
const fs   = require('fs');
const path = require('path');
const { scoreAllCandidates } = require('./contentScorer');

const MODELS_DIR = path.join(__dirname, '../../models');

// How much weight the NCF model gets vs the content scorer
// 0.4 means NCF contributes 40%, content contributes 60%
// Content gets more weight since it's the more established system
const NCF_WEIGHT = 0.4;

// Cached model and maps — loaded once on first request, reused after that
let cachedModel = null;
let cachedMaps  = null;

// Loads the trained NCF model and its ID maps from disk
// Returns null if the model files don't exist (hasn't been trained yet)
async function loadNCFModel() {
  if (cachedModel && cachedMaps) return { model: cachedModel, maps: cachedMaps };

  const modelPath = path.join(MODELS_DIR, 'model.json');
  const mapsPath  = path.join(MODELS_DIR, 'maps.json');

  if (!fs.existsSync(modelPath) || !fs.existsSync(mapsPath)) {
    console.log('NCF model not found — hybrid scorer will use content-only mode');
    return null;
  }

  try {
    const modelTopology = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const weightSpecs   = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'weight_specs.json'), 'utf8'));
    const weightData    = fs.readFileSync(path.join(MODELS_DIR, 'weights.bin')).buffer;

    const handler = tf.io.fromMemory(modelTopology, weightSpecs, weightData);
    cachedModel   = await tf.loadLayersModel(handler);
    cachedMaps    = JSON.parse(fs.readFileSync(mapsPath, 'utf8'));

    console.log('NCF model loaded for hybrid scoring');
    return { model: cachedModel, maps: cachedMaps };
  } catch (err) {
    console.error('Failed to load NCF model:', err.message);
    return null;
  }
}

// Predict NCF scores for a batch of places for one user
// Returns a Map of placeId → ncfScore, or null if the user isn't in the model
function predictNCFScores(model, maps, userId, places) {
  const userIdx = maps.userMap[userId];
  if (userIdx === undefined) return null; // unknown user — fall back to content-only

  const placeIndices       = [];
  const categoryIndices    = [];
  const subcategoryIndices = [];
  const validPlaceIds      = [];

  for (const place of places) {
    const placeIdx  = maps.placeMap[place.id];
    const catIdx    = maps.categoryMap[place.category];
    const subcatIdx = maps.subcategoryMap ? maps.subcategoryMap[place.subcategory] : undefined;

    // Skip places or categories not in the trained model
    if (placeIdx === undefined || catIdx === undefined || subcatIdx === undefined) continue;

    validPlaceIds.push(place.id);
    placeIndices.push(placeIdx);
    categoryIndices.push(catIdx);
    subcategoryIndices.push(subcatIdx);
  }

  if (validPlaceIds.length === 0) return null;

  // Build input tensors — same shape the model expects
  const userIndices = new Array(validPlaceIds.length).fill(userIdx);

  const userT        = tf.tensor2d(userIndices,       [validPlaceIds.length, 1], 'int32');
  const placeT       = tf.tensor2d(placeIndices,      [validPlaceIds.length, 1], 'int32');
  const categoryT    = tf.tensor2d(categoryIndices,   [validPlaceIds.length, 1], 'int32');
  const subcategoryT = tf.tensor2d(subcategoryIndices,[validPlaceIds.length, 1], 'int32');

  const predictions = model.predict([userT, placeT, categoryT, subcategoryT]);
  const values      = predictions.dataSync();

  // Clean up GPU/CPU memory
  userT.dispose();
  placeT.dispose();
  categoryT.dispose();
  subcategoryT.dispose();
  predictions.dispose();

  // Build a lookup map: placeId → predicted score
  const scoreMap = new Map();
  for (let i = 0; i < validPlaceIds.length; i++) {
    scoreMap.set(validPlaceIds[i], values[i]);
  }

  return scoreMap;
}

async function getHybridRecommendations(userId, { city, limit = 20 } = {}) {
  // Get content-based scores for all candidate places
  const { scored: candidates, meta } = await scoreAllCandidates(userId, { city });

  // Try to load the NCF model
  const ncf = await loadNCFModel();

  let ncfScores = null;
  if (ncf) {
    ncfScores = predictNCFScores(ncf.model, ncf.maps, userId, candidates);
  }

  const useHybrid = ncfScores !== null;

  // Blend the two scores for each place
  const blended = candidates.map(place => {
    const contentScore = place.contentScore;
    let finalScore;

    if (useHybrid && ncfScores.has(place.id)) {
      const ncfScore = ncfScores.get(place.id);
      finalScore = NCF_WEIGHT * ncfScore + (1 - NCF_WEIGHT) * contentScore;
    } else {
      // Place not in NCF model or user unknown — use content score alone
      finalScore = contentScore;
    }

    return {
      ...place,
      score: parseFloat(finalScore.toFixed(4)),
    };
  });

  // Sort highest score first, return top N
  blended.sort((a, b) => b.score - a.score);

  return {
    recommendations: blended.slice(0, limit),
    meta: {
      ...meta,
      scoringMode: useHybrid ? 'hybrid' : 'content_only',
      ncfWeight:   useHybrid ? NCF_WEIGHT : 0,
    },
  };
}

module.exports = { getHybridRecommendations };
