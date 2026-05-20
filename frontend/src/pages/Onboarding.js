// First-time setup screen shown after registration to store the user's initial preferences

import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Zap, Home, TreePine, Sparkles, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Onboarding.css';

const CATEGORIES = [
  { label: 'Adventure',          value: 'adventure',         Icon: Zap },
  { label: 'Indoor Fun',         value: 'indoor_activity',   Icon: Home },
  { label: 'Outdoors',           value: 'outdoor_activity',  Icon: TreePine },
  { label: 'Unique Experiences', value: 'unique_experience', Icon: Sparkles },
  { label: 'Sports & Fitness',   value: 'sports_fitness',    Icon: Trophy },
];

const INTERESTS = [
  'Escape Rooms', 'Axe Throwing', 'Kayaking', 'Climbing', 'VR Gaming',
  'Art & Crafts', 'Wellness', 'Live Events', 'Hidden Venues', 'Date Night',
  'Group Activities', 'Solo Adventure', 'High Energy', 'Chill Vibes',
  'Water Sports', 'Padel',
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]                             = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedInterests, setSelectedInterests]   = useState([]);
  const [saving, setSaving]                         = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/preferences')
      .then(res => {
        const p = res.data.preferences;
        if (p.preferred_categories?.length)  setSelectedCategories(p.preferred_categories);
        if (p.interests?.length)             setSelectedInterests(p.interests);
      })
      .catch(() => {});
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  function toggleCategory(value) {
    setSelectedCategories(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
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
        preferred_categories: selectedCategories,
        interests:            selectedInterests,
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
            {[1, 2].map(n => (
              <div key={n} className={`ob-dot${n === step ? ' active' : n < step ? ' done' : ''}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="ob-body" key="step1">
            <p className="ob-step-label">Step 1 of 2</p>
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
            <p className="ob-step-label">Step 2 of 2</p>
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
              <button className="ob-btn-skip" onClick={() => setStep(1)}>← Back</button>
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
