// First-time setup screen shown after registration to store the user's initial preferences

import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Utensils, Wine, Landmark, Leaf, Music, ShoppingBag, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Onboarding.css';

const CATEGORIES = [
  { label: 'Restaurants',   value: 'restaurant',   Icon: Utensils },
  { label: 'Bars',          value: 'bar',           Icon: Wine },
  { label: 'Museums',       value: 'museum',        Icon: Landmark },
  { label: 'Parks',         value: 'park',          Icon: Leaf },
  { label: 'Entertainment', value: 'entertainment', Icon: Music },
  { label: 'Shopping',      value: 'shopping',      Icon: ShoppingBag },
  { label: 'Attractions',   value: 'attraction',    Icon: Camera },
];

const PRICE_LABELS = ['', 'Budget', 'Affordable', 'Mid-range', 'Premium'];

const INTERESTS = [
  'History', 'Food & Drink', 'Nightlife', 'Outdoors', 'Culture',
  'Art', 'Shopping', 'Sports', 'Music', 'Architecture', 'Cinema', 'Nature',
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]                           = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceMax, setPriceMax]                   = useState(4);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [saving, setSaving]                       = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  function toggleCategory(value) {
    setSelectedCategories(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  }

  // Clicking any level sets it as the upper limit — range always starts at £ (1)
  function handlePriceClick(level) {
    setPriceMax(level);
  }

  function toggleInterest(interest) {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/preferences', {
        preferred_categories:  selectedCategories,
        preferred_price_range: { min: 1, max: priceMax },
        interests:             selectedInterests,
      });
    } catch {
      // Preferences are a bonus — if this fails we still take the user to their feed
    } finally {
      setSaving(false);
      navigate('/discover');
    }
  }

  return (
    <div className="ob-page">
      <div className="ob-card">

        <div className="ob-top">
          <Link to="/" className="ob-logo">Urban <span>Explorer</span></Link>
          <div className="ob-dots">
            {[1, 2, 3].map(n => (
              <div key={n} className={`ob-dot${n === step ? ' active' : n < step ? ' done' : ''}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="ob-body" key="step1">
            <p className="ob-step-label">Step 1 of 3</p>
            <h2 className="ob-title">What kind of places do you love?</h2>
            <p className="ob-sub">Pick anything that interests you — we'll use this to personalise your first recommendations.</p>

            <div className="ob-cat-grid">
              {CATEGORIES.map(({ label, value, Icon }) => (
                <button
                  key={value}
                  className={`ob-cat-chip${selectedCategories.includes(value) ? ' selected' : ''}`}
                  onClick={() => toggleCategory(value)}
                >
                  <Icon size={22} strokeWidth={1.6} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="ob-actions">
              <button className="ob-btn-skip" onClick={() => navigate('/discover')}>Skip setup</button>
              <button className="ob-btn-next" onClick={() => setStep(2)}>Next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-body" key="step2">
            <p className="ob-step-label">Step 2 of 3</p>
            <h2 className="ob-title">What's your budget range?</h2>
            <p className="ob-sub">Tap a tile to set your upper limit — everything up to that level will be included.</p>

            <div className="ob-price-row">
              {[1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  className={`ob-price-btn${level <= priceMax ? ' selected' : ''}`}
                  onClick={() => handlePriceClick(level)}
                >
                  <span className="ob-price-symbol">{'£'.repeat(level)}</span>
                  <span className="ob-price-label">{PRICE_LABELS[level]}</span>
                </button>
              ))}
            </div>
            <p className="ob-price-hint">
              Budget – {PRICE_LABELS[priceMax]}
            </p>

            <div className="ob-actions">
              <button className="ob-btn-skip" onClick={() => setStep(1)}>← Back</button>
              <button className="ob-btn-next" onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="ob-body" key="step3">
            <p className="ob-step-label">Step 3 of 3</p>
            <h2 className="ob-title">What are you into?</h2>
            <p className="ob-sub">These help us surface hidden gems that match your lifestyle — select as many as you like.</p>

            <div className="ob-interest-grid">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  className={`ob-interest-chip${selectedInterests.includes(interest) ? ' selected' : ''}`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>

            <div className="ob-actions">
              <button className="ob-btn-skip" onClick={() => setStep(2)}>← Back</button>
              <button className="ob-btn-next" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Get Started →'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
