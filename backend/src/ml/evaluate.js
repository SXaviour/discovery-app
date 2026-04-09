// Evaluates how good the trained NCF model actually is at recommending places
// Run with: npm run evaluate
//
// Measures three things:
//   RMSE — how far off are the model's predicted scores from real scores (in star terms)
//   Precision@10 — of the top 10 recommendations, how many did the user actually enjoy
//   Coverage — what percentage of all places does the model ever recommend to someone

require('dotenv').config();
const tf   = require('@tensorflow/tfjs');
const fs   = require('fs');
const path = require('path');
const db   = require('../config/database');

const MODELS_DIR = path.join(__dirname, '../../models');
const K          = 10;     // Top K recommendations to evaluate
const POSITIVE_THRESHOLD = 0.8; // Score >= 0.8 (4+ stars) counts as "user liked this"

// Same preference score logic as train.js — converts interactions to one score per user-place pair
function toPreferenceScore(interactions) {
  const grouped = {};
  for (const row of interactions) {
    const key = `${row.user_id}_${row.place_id}`;
    if (!grouped[key]) grouped[key] = { user_id: row.user_id, place_id: row.place_id, category: row.category, subcategory: row.subcategory, rows: [] };
    grouped[key].rows.push(row);
  }

  const samples = [];
  for (const { user_id, place_id, category, subcategory, rows } of Object.values(grouped)) {
    const hasRating   = rows.find(r => r.interaction_type === 'rating');
    const hasFavorite = rows.find(r => r.interaction_type === 'favorite');

    let score = 3.0;
    if (hasRating) {
      score = parseFloat(hasRating.rating_value);
      if (hasFavorite) score = Math.min(score + 0.5, 5);
    } else if (hasFavorite) {
      score = 4.0;
    }

    // Must match the normalization in train.js: (score - 1) / 4
    // 1 star = 0.0, 3 stars = 0.5, 5 stars = 1.0
    samples.push({ user_id: parseInt(user_id), place_id: parseInt(place_id), category, subcategory, score: (score - 1) / 4 });
  }

  return samples;
}

// Load the saved model from disk using the custom handler (since pure tfjs has no file:// support)
async function loadModel() {
  const modelTopology = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'model.json'), 'utf8'));
  const weightSpecs   = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'weight_specs.json'), 'utf8'));
  const weightData    = fs.readFileSync(path.join(MODELS_DIR, 'weights.bin')).buffer;

  const handler = tf.io.fromMemory(modelTopology, weightSpecs, weightData);
  return tf.loadLayersModel(handler);
}

// Predict the score for a batch of user-place-category-subcategory tuples
function predictBatch(model, userIndices, placeIndices, categoryIndices, subcategoryIndices) {
  const userT        = tf.tensor2d(userIndices,        [userIndices.length, 1],        'int32');
  const placeT       = tf.tensor2d(placeIndices,       [placeIndices.length, 1],       'int32');
  const categoryT    = tf.tensor2d(categoryIndices,    [categoryIndices.length, 1],    'int32');
  const subcategoryT = tf.tensor2d(subcategoryIndices, [subcategoryIndices.length, 1], 'int32');

  const predictions = model.predict([userT, placeT, categoryT, subcategoryT]);
  const values      = predictions.dataSync();

  userT.dispose();
  placeT.dispose();
  categoryT.dispose();
  subcategoryT.dispose();
  predictions.dispose();

  return Array.from(values);
}

async function evaluate() {
  console.log('Loading data...');

  // Load interactions from DB
  const result = await db.query(`
    SELECT ui.user_id, ui.place_id, ui.interaction_type, ui.rating_value,
           p.category, p.subcategory
    FROM user_interactions ui
    JOIN places p ON ui.place_id = p.id
  `);
  const samples = toPreferenceScore(result.rows);

  // Load the saved model and ID maps
  const model = await loadModel();
  const maps  = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'maps.json'), 'utf8'));
  const { userMap, placeMap, categoryMap, subcategoryMap } = maps;

  // Only evaluate users and places that exist in the trained model's maps
  const validSamples = samples.filter(s =>
    userMap[s.user_id] !== undefined &&
    placeMap[s.place_id] !== undefined &&
    categoryMap[s.category] !== undefined &&
    subcategoryMap[s.subcategory] !== undefined
  );

  console.log(`  ${validSamples.length} valid samples (of ${samples.length} total)\n`);

  // Group samples by user so we can split per user
  const byUser = {};
  for (const s of validSamples) {
    if (!byUser[s.user_id]) byUser[s.user_id] = [];
    byUser[s.user_id].push(s);
  }

  // Split 80/20 per user — hold out 20% of each user's interactions as test data
  const trainSet = [];
  const testSet  = [];
  for (const [userId, userSamples] of Object.entries(byUser)) {
    const shuffled = [...userSamples].sort(() => Math.random() - 0.5);
    const splitAt  = Math.floor(shuffled.length * 0.8);
    trainSet.push(...shuffled.slice(0, splitAt));
    testSet.push(...shuffled.slice(splitAt));
  }

  console.log(`  Train: ${trainSet.length}, Test: ${testSet.length}\n`);

  // ─── RMSE ───────────────────────────────────────────────
  // Predict each test sample and measure how far off we are
  console.log('Calculating RMSE...');

  const testUserIndices        = testSet.map(s => userMap[s.user_id]);
  const testPlaceIndices       = testSet.map(s => placeMap[s.place_id]);
  const testCategoryIndices    = testSet.map(s => categoryMap[s.category]);
  const testSubcategoryIndices = testSet.map(s => subcategoryMap[s.subcategory]);
  const testActualScores       = testSet.map(s => s.score);

  const predicted = predictBatch(model, testUserIndices, testPlaceIndices, testCategoryIndices, testSubcategoryIndices);

  let sumSquaredError = 0;
  for (let i = 0; i < testSet.length; i++) {
    sumSquaredError += Math.pow(predicted[i] - testActualScores[i], 2);
  }
  const rmse      = Math.sqrt(sumSquaredError / testSet.length);
  // Convert back to star scale: score range is 0–1 mapping to 1–5 stars, so multiply by 4
  const rmseStars = rmse * 4;

  console.log(`  RMSE: ${rmse.toFixed(4)} (${rmseStars.toFixed(2)} stars on a 5-star scale)\n`);

  // ─── PRECISION@K ────────────────────────────────────────
  // For each user: score all places not in their train set, take top K, check against test positives
  console.log(`Calculating Precision@${K}...`);

  const trainPlacesByUser = {};
  for (const s of trainSet) {
    if (!trainPlacesByUser[s.user_id]) trainPlacesByUser[s.user_id] = new Set();
    trainPlacesByUser[s.user_id].add(s.place_id);
  }

  // Test positives per user — places they actually scored >= threshold
  const testPositivesByUser = {};
  for (const s of testSet) {
    if (s.score >= POSITIVE_THRESHOLD) {
      if (!testPositivesByUser[s.user_id]) testPositivesByUser[s.user_id] = new Set();
      testPositivesByUser[s.user_id].add(s.place_id);
    }
  }

  // All place IDs and their categories/subcategories for candidate scoring
  const allPlaceEntries = Object.entries(placeMap);
  const placeLookupResult = await db.query('SELECT id, category, subcategory FROM places WHERE is_closed = false');
  const placeLookup = {};
  for (const row of placeLookupResult.rows) {
    placeLookup[row.id] = { category: row.category, subcategory: row.subcategory };
  }

  let totalPrecision     = 0;
  let usersEvaluated     = 0;
  const allRecommendedIds = new Set();

  const userIds = Object.keys(testPositivesByUser).map(Number);

  for (const userId of userIds) {
    const trainPlaces = trainPlacesByUser[userId] || new Set();
    const positives   = testPositivesByUser[userId];
    if (!positives || positives.size === 0) continue;

    // Score all places this user hasn't seen in training
    const candidatePlaceIds   = [];
    const candidateIndices    = [];
    const candidateCatIdxs    = [];
    const candidateSubcatIdxs = [];

    for (const [placeIdStr, placeIdx] of allPlaceEntries) {
      const placeId     = parseInt(placeIdStr);
      const placeInfo   = placeLookup[placeId];
      if (trainPlaces.has(placeId)) continue;
      if (!placeInfo || categoryMap[placeInfo.category] === undefined) continue;
      if (subcategoryMap[placeInfo.subcategory] === undefined) continue;

      candidatePlaceIds.push(placeId);
      candidateIndices.push(placeIdx);
      candidateCatIdxs.push(categoryMap[placeInfo.category]);
      candidateSubcatIdxs.push(subcategoryMap[placeInfo.subcategory]);
    }

    if (candidatePlaceIds.length === 0) continue;

    const userIdxArray = new Array(candidateIndices.length).fill(userMap[userId]);
    const scores = predictBatch(model, userIdxArray, candidateIndices, candidateCatIdxs, candidateSubcatIdxs);

    // Get top K place IDs by predicted score
    const scored = candidatePlaceIds.map((pid, i) => ({ placeId: pid, score: scores[i] }));
    scored.sort((a, b) => b.score - a.score);
    const topK = scored.slice(0, K);

    // Count how many of the top K were actually liked
    let hits = 0;
    for (const rec of topK) {
      allRecommendedIds.add(rec.placeId);
      if (positives.has(rec.placeId)) hits++;
    }

    totalPrecision += hits / K;
    usersEvaluated++;
  }

  const avgPrecision = usersEvaluated > 0 ? totalPrecision / usersEvaluated : 0;
  console.log(`  Precision@${K}: ${(avgPrecision * 100).toFixed(1)}% (${usersEvaluated} users evaluated)\n`);

  // ─── COVERAGE ───────────────────────────────────────────
  const totalPlaces = Object.keys(placeMap).length;
  const coverage    = allRecommendedIds.size / totalPlaces;
  console.log(`  Coverage: ${(coverage * 100).toFixed(1)}% (${allRecommendedIds.size} of ${totalPlaces} places recommended)\n`);

  // ─── SAVE RESULTS ───────────────────────────────────────
  const results = {
    timestamp:   new Date().toISOString(),
    testSize:    testSet.length,
    trainSize:   trainSet.length,
    rmse:        parseFloat(rmse.toFixed(6)),
    rmseStars:   parseFloat(rmseStars.toFixed(2)),
    precisionAtK: {
      k:              K,
      value:          parseFloat(avgPrecision.toFixed(4)),
      usersEvaluated: usersEvaluated,
    },
    coverage: {
      value:            parseFloat(coverage.toFixed(4)),
      placesRecommended: allRecommendedIds.size,
      totalPlaces:       totalPlaces,
    },
  };

  fs.writeFileSync(
    path.join(MODELS_DIR, 'evaluation_results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('Results saved to models/evaluation_results.json');
  console.log('\n── Summary ──────────────────────────────');
  console.log(`  RMSE:          ${rmse.toFixed(4)} (${rmseStars.toFixed(2)} stars)`);
  console.log(`  Precision@${K}: ${(avgPrecision * 100).toFixed(1)}%`);
  console.log(`  Coverage:      ${(coverage * 100).toFixed(1)}%`);

  await db.end();
}

evaluate().catch(err => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
