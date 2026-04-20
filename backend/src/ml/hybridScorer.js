// Hybrid recommendation scorer — two-stage pipeline
// Stage 1: Content scorer ranks ALL unseen places, returns top 100 candidates
// Stage 2: NCF re-ranks those top 100 using collaborative filtering signal

// Blending uses Reciprocal Rank Fusion (RRF) instead of raw score mixing.
// RRF is scale-independent — it converts NCF output to a rank first,
// so we're never mixing two uncalibrated numbers directly.

// Falls back to content-only if the model isn't loaded or user is unknown.

const tf   = require('@tensorflow/tfjs');
const fs   = require('fs');
const path = require('path');
const { scoreAllCandidates } = require('./contentScorer');

const MODELS_DIR = path.join(__dirname, '../../models');

// How many content candidates to pass into the NCF re-ranker
// NCF only needs to differentiate between already-good options
const NCF_CANDIDATE_POOL = 100;

// RRF damping constant — standard value from the original RRF paper
// Dampens the gap between rank 1 and rank 10, making blending more stable
const RRF_K = 60;

// Content carries 70%, NCF rank boost carries 30%
const CONTENT_WEIGHT = 0.7;
const NCF_WEIGHT     = 0.3;

// Cached model and maps — loaded once on first request, reused after that
let cachedModel = null;
let cachedMaps  = null;

// Loads the trained NCF model from disk
// Returns null if the model files don't exist (run npm run train first)
async function loadNCFModel() {
  if (cachedModel && cachedMaps) return { model: cachedModel, maps: cachedMaps };

  const modelPath = path.join(MODELS_DIR, 'model.json');
  const mapsPath  = path.join(MODELS_DIR, 'maps.json');

  if (!fs.existsSync(modelPath) || !fs.existsSync(mapsPath)) {
    console.log('NCF model not found — using content-only mode');
    return null;
  }

  try {
    const modelTopology = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const weightSpecs   = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'weight_specs.json'), 'utf8'));
    const weightData    = fs.readFileSync(path.join(MODELS_DIR, 'weights.bin')).buffer;

    const handler = tf.io.fromMemory(modelTopology, weightSpecs, weightData);
    cachedModel   = await tf.loadLayersModel(handler);
    cachedMaps    = JSON.parse(fs.readFileSync(mapsPath, 'utf8'));

    console.log('NCF model loaded');
    return { model: cachedModel, maps: cachedMaps };
  } catch (err) {
    console.error('Failed to load NCF model:', err.message);
    return null;
  }
}

// Runs NCF predictions for a batch of places for one user
// Returns a Map of placeId → ncfScore, or null if the user isn't in the training data
function predictNCFScores(model, maps, userId, places) {
  const userIdx = maps.userMap[userId];
  if (userIdx === undefined) return null; // new user — fall back to content-only

  const placeIndices       = [];
  const categoryIndices    = [];
  const subcategoryIndices = [];
  const validPlaceIds      = [];

  for (const place of places) {
    const placeIdx  = maps.placeMap[place.id];
    const catIdx    = maps.categoryMap[place.category];
    const subcatIdx = maps.subcategoryMap ? maps.subcategoryMap[place.subcategory] : undefined;

    if (placeIdx === undefined || catIdx === undefined || subcatIdx === undefined) continue;

    validPlaceIds.push(place.id);
    placeIndices.push(placeIdx);
    categoryIndices.push(catIdx);
    subcategoryIndices.push(subcatIdx);
  }

  if (validPlaceIds.length === 0) return null;

  const n = validPlaceIds.length;
  const userIndices = new Array(n).fill(userIdx);

  const userT        = tf.tensor2d(userIndices,        [n, 1], 'int32');
  const placeT       = tf.tensor2d(placeIndices,       [n, 1], 'int32');
  const categoryT    = tf.tensor2d(categoryIndices,    [n, 1], 'int32');
  const subcategoryT = tf.tensor2d(subcategoryIndices, [n, 1], 'int32');

  const predictions = model.predict([userT, placeT, categoryT, subcategoryT]);
  const values      = predictions.dataSync();

  userT.dispose();
  placeT.dispose();
  categoryT.dispose();
  subcategoryT.dispose();
  predictions.dispose();

  const scoreMap = new Map();
  for (let i = 0; i < validPlaceIds.length; i++) {
    scoreMap.set(validPlaceIds[i], values[i]);
  }

  return scoreMap;
}

async function getHybridRecommendations(userId, { city, limit = 20 } = {}) {
  // Stage 1 — content scorer ranks every unseen place
  const { scored: allCandidates, meta } = await scoreAllCandidates(userId, { city });

  // Sort by content score and take the top 100 to pass to the NCF re-ranker
  // No point running NCF on 800+ places when content already filters to the best ones
  allCandidates.sort((a, b) => b.contentScore - a.contentScore);
  const top = allCandidates.slice(0, NCF_CANDIDATE_POOL);
  const rest = allCandidates.slice(NCF_CANDIDATE_POOL); // everything else gets content score only

  // Stage 2 — try to load NCF and re-rank the top 100
  const ncf = await loadNCFModel();
  const ncfScores = ncf ? predictNCFScores(ncf.model, ncf.maps, userId, top) : null;
  const useHybrid = ncfScores !== null;

  let finalList;

  if (useHybrid) {
    // Sort top 100 by NCF score to get NCF ranks
    const rankedByNcf = [...top].sort((a, b) => {
      const scoreA = ncfScores.get(a.id) ?? 0;
      const scoreB = ncfScores.get(b.id) ?? 0;
      return scoreB - scoreA;
    });

    // Assign each place its NCF rank, then blend using RRF
    // rankBoost = 1 / (rank + RRF_K) — lower rank = higher boost
    // This keeps scores scale-independent: we're blending a content score (0–1)
    // with a rank signal (0.016 at rank 1 down to ~0.006 at rank 100)
    const ncfRankMap = new Map(rankedByNcf.map((place, i) => [place.id, i]));

    const blendedTop = top.map(place => {
      const ncfRank  = ncfRankMap.get(place.id) ?? NCF_CANDIDATE_POOL;
      const rankBoost = 1 / (ncfRank + RRF_K);
      return {
        ...place,
        score: parseFloat((CONTENT_WEIGHT * place.contentScore + NCF_WEIGHT * rankBoost).toFixed(4)),
      };
    });

    // Merge: blended top 100 + content-scored rest, sort everything together
    const blendedRest = rest.map(place => ({
      ...place,
      score: parseFloat(place.contentScore.toFixed(4)),
    }));

    finalList = [...blendedTop, ...blendedRest].sort((a, b) => b.score - a.score);
  } else {
    // No NCF available — use content score directly for everyone
    finalList = allCandidates.map(place => ({
      ...place,
      score: parseFloat(place.contentScore.toFixed(4)),
    }));
    finalList.sort((a, b) => b.score - a.score);
  }

  return {
    recommendations: finalList.slice(0, limit),
    meta: {
      ...meta,
      scoringMode:      useHybrid ? 'hybrid' : 'content_only',
      ncfCandidatePool: useHybrid ? NCF_CANDIDATE_POOL : 0,
    },
  };
}

module.exports = { getHybridRecommendations };
