// Handles reading and updating the logged-in user's preferences

const { getPreferences, upsertPreferences } = require('../database/preferencesHelpers');

// GET /api/preferences
// Returns the current user's saved preferences
async function getMyPreferences(req, res) {
  try {
    const prefs = await getPreferences(req.session.userId);

    // If no preferences saved yet, return sensible defaults
    if (!prefs) {
      return res.json({
        success: true,
        preferences: {
          preferred_categories:  [],
          preferred_price_range: { min: 1, max: 4 },
          interests:             [],
        },
      });
    }

    res.json({ success: true, preferences: prefs });

  } catch (error) {
    console.error('getMyPreferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
}

// PUT /api/preferences
// Updates the user's preferences — only the fields sent in the body are updated
// Body example:
// {
//   "preferred_categories": ["restaurant", "museum"],
//   "preferred_price_range": { "min": 1, "max": 3 },
//   "interests": ["history", "food", "outdoors"]
// }
async function updateMyPreferences(req, res) {
  try {
    const { preferred_categories, preferred_price_range, interests, default_city } = req.body;

    const validCategories = ['adventure', 'indoor_activity', 'outdoor_activity', 'unique_experience', 'sports_fitness'];
    if (preferred_categories) {
      const invalid = preferred_categories.filter(c => !validCategories.includes(c));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid categories: ${invalid.join(', ')}`,
        });
      }
    }

    // Validate price range if provided
    if (preferred_price_range) {
      const { min, max } = preferred_price_range;
      if (min < 1 || max > 4 || min > max) {
        return res.status(400).json({
          success: false,
          error: 'Price range min must be 1–4, max must be 1–4, and min must not exceed max',
        });
      }
    }

    const updated = await upsertPreferences(req.session.userId, {
      preferred_categories,
      preferred_price_range,
      interests,
      default_city,
    });

    res.json({ success: true, preferences: updated });

  } catch (error) {
    console.error('updateMyPreferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
}

module.exports = { getMyPreferences, updateMyPreferences };
