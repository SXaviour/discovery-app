// NCF (Neural Collaborative Filtering) training script
// Learns user and place taste patterns from the interaction dataset
// Run with: npm run train
//
// What this does:
//   1. Loads all interactions from the database
//   2. Converts them to unified preference scores (ratings + favorites + visited)
//   3. Builds a neural network with user and place embedding layers
//   4. Trains it to predict how much a user would enjoy a place
//   5. Saves the trained model and ID mappings to backend/models/

require('dotenv').config();
const tf   = require('@tensorflow/tfjs');
const fs   = require('fs');
const path = require('path');
const db   = require('../config/database');

const MODELS_DIR    = path.join(__dirname, '../../models');
const EMBEDDING_DIM = 32;   // How many numbers represent each user/place — higher = more expressive but slower
const EPOCHS        = 20;   // How many full passes through the training data
const BATCH_SIZE    = 512;  // How many samples to process at once during training
const LEARNING_RATE = 0.001;

// ---------- STEP 1: LOAD INTERACTIONS ----------

async function loadInteractions() {
  const result = await db.query(`
    SELECT user_id, place_id, interaction_type, rating_value
    FROM user_interactions
  `);
  return result.rows;
}

// ---------- STEP 2: CONVERT TO PREFERENCE SCORES ----------
// Combines all interaction types for the same user+place into one score
// Same logic as the user profile system so everything is consistent

function toPreferenceScore(interactions) {
  // Group by user_id + place_id
  const grouped = {};
  for (const row of interactions) {
    const key = `${row.user_id}_${row.place_id}`;
    if (!grouped[key]) grouped[key] = { user_id: row.user_id, place_id: row.place_id, rows: [] };
    grouped[key].rows.push(row);
  }

  const samples = [];
  for (const { user_id, place_id, rows } of Object.values(grouped)) {
    const hasRating   = rows.find(r => r.interaction_type === 'rating');
    const hasFavorite = rows.find(r => r.interaction_type === 'favorite');
    const hasVisited  = rows.find(r => r.interaction_type === 'visited');

    let score = 3.0; // default: visited only
    if (hasRating) {
      score = parseFloat(hasRating.rating_value);
      if (hasFavorite) score = Math.min(score + 0.5, 5);
    } else if (hasFavorite) {
      score = 4.0;
    } else if (hasVisited) {
      score = 3.0;
    }

    // Normalize score to 0–1 range for the neural network
    samples.push({ user_id: parseInt(user_id), place_id: parseInt(place_id), score: score / 5 });
  }

  return samples;
}

// ---------- STEP 3: BUILD ID MAPS ----------
// The model works with sequential indices (0, 1, 2...) not database IDs (which can have gaps)

function buildMaps(samples) {
  const userIds  = [...new Set(samples.map(s => s.user_id))].sort((a, b) => a - b);
  const placeIds = [...new Set(samples.map(s => s.place_id))].sort((a, b) => a - b);

  const userMap  = Object.fromEntries(userIds.map((id, i)  => [id, i]));
  const placeMap = Object.fromEntries(placeIds.map((id, i) => [id, i]));

  return { userMap, placeMap, numUsers: userIds.length, numPlaces: placeIds.length };
}

// ---------- STEP 4: BUILD THE MODEL ----------
// NCF architecture: user embedding + place embedding → dense layers → predicted score
//
// An embedding is a row of learned numbers that represents a user or place
// Two users with similar taste end up with similar embedding values
// The model learns these embeddings by trying to predict scores accurately

function buildModel(numUsers, numPlaces) {
  const userInput  = tf.input({ shape: [1], name: 'user_input' });
  const placeInput = tf.input({ shape: [1], name: 'place_input' });

  // Each user and place gets a vector of EMBEDDING_DIM numbers
  const userEmbedding  = tf.layers.embedding({ inputDim: numUsers,  outputDim: EMBEDDING_DIM, name: 'user_embedding'  }).apply(userInput);
  const placeEmbedding = tf.layers.embedding({ inputDim: numPlaces, outputDim: EMBEDDING_DIM, name: 'place_embedding' }).apply(placeInput);

  // Flatten from shape [1, 32] to [32] so we can combine them
  const userFlat  = tf.layers.flatten().apply(userEmbedding);
  const placeFlat = tf.layers.flatten().apply(placeEmbedding);

  // Concatenate user and place embeddings into one vector, then pass through dense layers
  const concat = tf.layers.concatenate().apply([userFlat, placeFlat]);
  const dense1 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(concat);
  const dense2 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(dense1);

  // Final output: a single number between 0–1 (the predicted preference score)
  const output = tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'output' }).apply(dense2);

  const model = tf.model({ inputs: [userInput, placeInput], outputs: output });

  model.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: 'meanSquaredError',
    metrics: ['mae'],
  });

  return model;
}

// ---------- STEP 5: PREPARE TENSORS ----------

function prepareTensors(samples, userMap, placeMap) {
  const userIndices  = samples.map(s => userMap[s.user_id]);
  const placeIndices = samples.map(s => placeMap[s.place_id]);
  const scores       = samples.map(s => s.score);

  return {
    userTensor:  tf.tensor2d(userIndices,  [samples.length, 1], 'int32'),
    placeTensor: tf.tensor2d(placeIndices, [samples.length, 1], 'int32'),
    scoreTensor: tf.tensor2d(scores,       [samples.length, 1], 'float32'),
  };
}

// ---------- STEP 6: TRAIN ----------

async function train() {
  console.log('Loading interactions from database...');
  const raw = await loadInteractions();
  console.log(`  ${raw.length} raw interaction rows loaded`);

  const samples = toPreferenceScore(raw);
  console.log(`  ${samples.length} unique user-place preference scores built\n`);

  const { userMap, placeMap, numUsers, numPlaces } = buildMaps(samples);
  console.log(`  ${numUsers} unique users, ${numPlaces} unique places\n`);

  const model = buildModel(numUsers, numPlaces);
  model.summary();

  const { userTensor, placeTensor, scoreTensor } = prepareTensors(samples, userMap, placeMap);

  console.log('\nTraining...\n');
  await model.fit([userTensor, placeTensor], scoreTensor, {
    epochs:          EPOCHS,
    batchSize:       BATCH_SIZE,
    validationSplit: 0.1, // Hold back 10% to check the model isn't just memorising the training data
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`  Epoch ${epoch + 1}/${EPOCHS} — loss: ${logs.loss.toFixed(4)}, val_loss: ${logs.val_loss.toFixed(4)}, mae: ${logs.mae.toFixed(4)}`);
      }
    }
  });

  // Clean up tensors from memory
  userTensor.dispose();
  placeTensor.dispose();
  scoreTensor.dispose();

  // ---------- STEP 7: SAVE ----------

  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

  const modelPath = `file://${MODELS_DIR}/ncf_model`;
  await model.save(modelPath);
  console.log(`\nModel saved to ${MODELS_DIR}/ncf_model`);

  // Save the ID maps alongside the model so inference knows how to convert DB IDs to indices
  fs.writeFileSync(
    path.join(MODELS_DIR, 'maps.json'),
    JSON.stringify({ userMap, placeMap, numUsers, numPlaces }, null, 2)
  );
  console.log('ID maps saved to models/maps.json');

  console.log('\nTraining complete.');
  await db.end();
}

train().catch(err => {
  console.error('Training failed:', err);
  process.exit(1);
});
