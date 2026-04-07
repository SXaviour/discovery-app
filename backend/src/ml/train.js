// NCF (Neural Collaborative Filtering) training script
// Learns user and place taste patterns from the interaction dataset
// Run with: npm run train

// What this does:
//   1. Loads all interactions from the database
//   2. Converts them to unified preference scores (ratings + favorites + visited)
//   3. Builds a neural network with user, place, and category embedding layers
//   4. Trains it to predict how much a user would enjoy a place
//   5. Saves the trained model and ID mappings to backend/models/

require('dotenv').config();
const tf   = require('@tensorflow/tfjs');
const fs   = require('fs');
const path = require('path');
const db   = require('../config/database');

const MODELS_DIR         = path.join(__dirname, '../../models');
const EMBEDDING_DIM      = 32;  // How many numbers represent each user/place — higher = more expressive but slower
const CATEGORY_EMBED_DIM = 8;   // Smaller embedding for categories — only 7 unique values, doesn't need 32
const EPOCHS             = 50;  // Max epochs — early stopping will likely cut this short
const BATCH_SIZE         = 512; // How many samples to process at once during training
const LEARNING_RATE      = 0.001;
const DROPOUT_RATE       = 0.3; // During training, randomly switch off 30% of neurons each pass to prevent memorisation
const PATIENCE           = 5;   // Stop training if val_loss hasn't improved in this many epochs

// STEP 1: LOAD INTERACTIONS

async function loadInteractions() {
  const result = await db.query(`
    SELECT ui.user_id, ui.place_id, ui.interaction_type, ui.rating_value, p.category
    FROM user_interactions ui
    JOIN places p ON ui.place_id = p.id
  `);
  return result.rows;
}

// STEP 2: CONVERT TO PREFERENCE SCORES
// Combines all interaction types for the same user+place into one score
// Same logic as the user profile system so everything is consistent

function toPreferenceScore(interactions) {
  // Group by user_id + place_id
  const grouped = {};
  for (const row of interactions) {
    const key = `${row.user_id}_${row.place_id}`;
    if (!grouped[key]) grouped[key] = { user_id: row.user_id, place_id: row.place_id, category: row.category, rows: [] };
    grouped[key].rows.push(row);
  }

  const samples = [];
  for (const { user_id, place_id, category, rows } of Object.values(grouped)) {
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
    samples.push({ user_id: parseInt(user_id), place_id: parseInt(place_id), category, score: score / 5 });
  }

  return samples;
}

// STEP 3: BUILD ID MAPS
// The model works with sequential indices (0, 1, 2...) not database IDs (which can have gaps)

function buildMaps(samples) {
  const userIds    = [...new Set(samples.map(s => s.user_id))].sort((a, b) => a - b);
  const placeIds   = [...new Set(samples.map(s => s.place_id))].sort((a, b) => a - b);
  const categories = [...new Set(samples.map(s => s.category))].sort();

  const userMap     = Object.fromEntries(userIds.map((id, i)    => [id, i]));
  const placeMap    = Object.fromEntries(placeIds.map((id, i)   => [id, i]));
  const categoryMap = Object.fromEntries(categories.map((c, i)  => [c, i]));

  return { userMap, placeMap, categoryMap, numUsers: userIds.length, numPlaces: placeIds.length, numCategories: categories.length };
}

// STEP 4: BUILD THE MODEL
// NCF architecture: user embedding + place embedding + category embedding → dense layers → predicted score

// An embedding is a row of learned numbers that represents a user or place
// Two users with similar taste end up with similar embedding values
// The model learns these embeddings by trying to predict scores accurately

function buildModel(numUsers, numPlaces, numCategories) {
  const userInput     = tf.input({ shape: [1], name: 'user_input' });
  const placeInput    = tf.input({ shape: [1], name: 'place_input' });
  const categoryInput = tf.input({ shape: [1], name: 'category_input' });

  // Each user and place gets a vector of EMBEDDING_DIM numbers
  // Category gets a smaller vector — only 7 categories, doesn't need as many dimensions
  const userEmbedding     = tf.layers.embedding({ inputDim: numUsers,      outputDim: EMBEDDING_DIM,      name: 'user_embedding'     }).apply(userInput);
  const placeEmbedding    = tf.layers.embedding({ inputDim: numPlaces,     outputDim: EMBEDDING_DIM,      name: 'place_embedding'    }).apply(placeInput);
  const categoryEmbedding = tf.layers.embedding({ inputDim: numCategories, outputDim: CATEGORY_EMBED_DIM, name: 'category_embedding' }).apply(categoryInput);

  // Flatten so we can combine them — user(32) + place(32) + category(8) = 72 dimensions
  const userFlat     = tf.layers.flatten().apply(userEmbedding);
  const placeFlat    = tf.layers.flatten().apply(placeEmbedding);
  const categoryFlat = tf.layers.flatten().apply(categoryEmbedding);

  // Concatenate all three embeddings, then pass through dense layers
  // Dropout layers randomly disable neurons during training to prevent overfitting
  const concat  = tf.layers.concatenate().apply([userFlat, placeFlat, categoryFlat]);
  const dense1  = tf.layers.dense({ units: 64, activation: 'relu' }).apply(concat);
  const drop1   = tf.layers.dropout({ rate: DROPOUT_RATE }).apply(dense1);
  const dense2  = tf.layers.dense({ units: 32, activation: 'relu' }).apply(drop1);
  const drop2   = tf.layers.dropout({ rate: DROPOUT_RATE }).apply(dense2);

  // Final output: a single number between 0–1 (the predicted preference score)
  const output = tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'output' }).apply(drop2);

  const model = tf.model({ inputs: [userInput, placeInput, categoryInput], outputs: output });

  model.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: 'meanSquaredError',
    metrics: ['mae'],
  });

  return model;
}

// STEP 5: PREPARE TENSORS

function prepareTensors(samples, userMap, placeMap, categoryMap) {
  const userIndices     = samples.map(s => userMap[s.user_id]);
  const placeIndices    = samples.map(s => placeMap[s.place_id]);
  const categoryIndices = samples.map(s => categoryMap[s.category]);
  const scores          = samples.map(s => s.score);

  return {
    userTensor:     tf.tensor2d(userIndices,     [samples.length, 1], 'int32'),
    placeTensor:    tf.tensor2d(placeIndices,    [samples.length, 1], 'int32'),
    categoryTensor: tf.tensor2d(categoryIndices, [samples.length, 1], 'int32'),
    scoreTensor:    tf.tensor2d(scores,          [samples.length, 1], 'float32'),
  };
}

// STEP 6: TRAIN

async function train() {
  console.log('Loading interactions from database...');
  const raw = await loadInteractions();
  console.log(`  ${raw.length} raw interaction rows loaded`);

  const samples = toPreferenceScore(raw);
  console.log(`  ${samples.length} unique user-place preference scores built\n`);

  const { userMap, placeMap, categoryMap, numUsers, numPlaces, numCategories } = buildMaps(samples);
  console.log(`  ${numUsers} unique users, ${numPlaces} unique places, ${numCategories} categories\n`);

  const model = buildModel(numUsers, numPlaces, numCategories);
  model.summary();

  const { userTensor, placeTensor, categoryTensor, scoreTensor } = prepareTensors(samples, userMap, placeMap, categoryMap);

  // Early stopping — tracks the best val_loss and stops training if it hasn't improved
  // in PATIENCE epochs. Also saves metrics to a JSON file for graphing in the report
  let bestValLoss   = Infinity;
  let waitCount     = 0;
  let bestEpoch     = 0;
  const metricsLog  = [];

  console.log('\nTraining...\n');
  await model.fit([userTensor, placeTensor, categoryTensor], scoreTensor, {
    epochs:          EPOCHS,
    batchSize:       BATCH_SIZE,
    validationSplit: 0.1,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const entry = {
          epoch:    epoch + 1,
          loss:     parseFloat(logs.loss.toFixed(6)),
          val_loss: parseFloat(logs.val_loss.toFixed(6)),
          mae:      parseFloat(logs.mae.toFixed(6)),
        };
        metricsLog.push(entry);

        console.log(`  Epoch ${entry.epoch}/${EPOCHS} — loss: ${logs.loss.toFixed(4)}, val_loss: ${logs.val_loss.toFixed(4)}, mae: ${logs.mae.toFixed(4)}`);

        // Check if val_loss improved
        if (logs.val_loss < bestValLoss) {
          bestValLoss = logs.val_loss;
          bestEpoch   = epoch + 1;
          waitCount   = 0;
        } else {
          waitCount++;
          if (waitCount >= PATIENCE) {
            console.log(`\n  Early stopping — val_loss hasn't improved since epoch ${bestEpoch} (best: ${bestValLoss.toFixed(4)})`);
            model.stopTraining = true;
          }
        }
      }
    }
  });

  // Clean up tensors from memory
  userTensor.dispose();
  placeTensor.dispose();
  categoryTensor.dispose();
  scoreTensor.dispose();

  // STEP 7: SAVE
  // tensorflow/tfjs (pure JS) has no built-in filesystem save handler — that's only in tfjs-node
  // Instead we use a custom save handler that intercepts the model artifacts and writes them
  // to disk manually using Node's fs module

  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

  const saveHandler = tf.io.withSaveHandler(async (artifacts) => {
    fs.writeFileSync(
      path.join(MODELS_DIR, 'model.json'),
      JSON.stringify(artifacts.modelTopology)
    );
    fs.writeFileSync(
      path.join(MODELS_DIR, 'weight_specs.json'),
      JSON.stringify(artifacts.weightSpecs)
    );
    fs.writeFileSync(
      path.join(MODELS_DIR, 'weights.bin'),
      Buffer.from(artifacts.weightData)
    );
    return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
  });

  await model.save(saveHandler);
  console.log(`\nModel saved to ${MODELS_DIR}`);

  // Save the ID maps alongside the model so inference knows how to convert DB IDs to indices
  fs.writeFileSync(
    path.join(MODELS_DIR, 'maps.json'),
    JSON.stringify({ userMap, placeMap, categoryMap, numUsers, numPlaces, numCategories }, null, 2)
  );
  console.log('ID maps saved to models/maps.json');

  // Save training metrics so they can be graphed for the report
  fs.writeFileSync(
    path.join(MODELS_DIR, 'training_metrics.json'),
    JSON.stringify(metricsLog, null, 2)
  );
  console.log('Training metrics saved to models/training_metrics.json');

  console.log(`\nTraining complete. Best val_loss: ${bestValLoss.toFixed(4)} at epoch ${bestEpoch}`);
  await db.end();
}

train().catch(err => {
  console.error('Training failed:', err);
  process.exit(1);
});
