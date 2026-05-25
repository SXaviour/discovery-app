import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Compass, Bookmark, User, Settings, Star, Heart, Check, LogOut, Zap, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import BottomNav from '../components/BottomNav';
import './Profile.css';

const UNLOCK_THRESHOLD = 5;

const CAT_COLORS = {
  adventure:         '#ef4444',
  indoor_activity:   '#6366f1',
  outdoor_activity:  '#22c55e',
  unique_experience: '#8b5cf6',
  sports_fitness:    '#f59e0b',
};

const CAT_LABELS = {
  adventure:         'Adventure',
  indoor_activity:   'Indoor Activities',
  outdoor_activity:  'Outdoors',
  unique_experience: 'Unique Experiences',
  sports_fitness:    'Sports & Fitness',
};

const PRICE_LABELS = { 1: 'Free', 2: 'Budget', 3: 'Mid-range', 4: 'Premium' };
const PRICE_COLORS = { 1: '#22c55e', 2: '#60a5fa', 3: '#f59e0b', 4: '#ef4444' };

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMemberSince(str) {
  return new Date(str).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]         = useState(null);
  const [activity, setActivity]       = useState([]);
  const [counts, setCounts]           = useState({ ratings: 0, saved: 0, visited: 0 });
  const [loading, setLoading]         = useState(true);
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [profileRes, activityRes] = await Promise.all([
          api.get('/recommendations/profile'),
          api.get('/interactions/my'),
        ]);
        const interactions = activityRes.data.interactions || [];
        setProfile(profileRes.data.profile);
        setActivity(interactions.slice(0, 10));
        setCounts({
          ratings: interactions.filter(i => i.interaction_type === 'rating').length,
          saved:   interactions.filter(i => i.interaction_type === 'favorite').length,
          visited: interactions.filter(i => i.interaction_type === 'visited').length,
        });
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  // Trigger bar animations after data loads
  useEffect(() => {
    if (!loading) setTimeout(() => setBarsVisible(true), 100);
  }, [loading]);

  if (!user) return <Navigate to="/login" replace />;

  const displayName  = user.username || user.email.split('@')[0];
  const interactionCount = profile?.interactionCount || 0;
  const isHybrid     = interactionCount >= UNLOCK_THRESHOLD;

  const sortedCats   = Object.entries(profile?.categoryAffinities || {})
    .sort((a, b) => b[1] - a[1]);

  const sortedPrices = Object.entries(profile?.priceLevelAffinities || {})
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="pf-layout">

      <aside className="pf-sidebar">
        <div className="pf-sidebar-logo">Urban <span>Explorer</span></div>
        <nav className="pf-sidebar-nav">
          <Link to="/discover" className="pf-sidebar-item"><Compass size={18} /><span>Discover</span></Link>
          <Link to="/saved"    className="pf-sidebar-item"><Bookmark size={18} /><span>Saved</span></Link>
          <Link to="/profile"  className="pf-sidebar-item active"><User size={18} /><span>Profile</span></Link>
          <Link to="/settings" className="pf-sidebar-item"><Settings size={18} /><span>Settings</span></Link>
        </nav>
        <div className="pf-sidebar-user">
          <div className="pf-sidebar-avatar">{displayName[0].toUpperCase()}</div>
          <div className="pf-sidebar-user-info">
            <div className="pf-sidebar-user-name">{displayName}</div>
            <div className="pf-sidebar-user-sub">View profile</div>
          </div>
        </div>
      </aside>

      <div className="pf-page">

        {/* ── USER HEADER ── */}
        <div className="pf-hero">
          <div className="pf-avatar">{displayName[0].toUpperCase()}</div>
          <div className="pf-hero-info">
            <h1 className="pf-name">{displayName}</h1>
            <p className="pf-email">{user.email}</p>
            {user.created_at && (
              <p className="pf-since">Member since {formatMemberSince(user.created_at)}</p>
            )}
          </div>
          <button className="pf-logout-btn" onClick={handleLogout}>
            <LogOut size={15} /> Log out
          </button>
        </div>

        {/* ── STATS ── */}
        <div className="pf-stats-row">
          <div className="pf-stat">
            <span className="pf-stat-num">{counts.ratings}</span>
            <span className="pf-stat-label">Ratings</span>
          </div>
          <div className="pf-stat-divider" />
          <div className="pf-stat">
            <span className="pf-stat-num">{counts.saved}</span>
            <span className="pf-stat-label">Saved</span>
          </div>
          <div className="pf-stat-divider" />
          <div className="pf-stat">
            <span className="pf-stat-num">{counts.visited}</span>
            <span className="pf-stat-label">Visited</span>
          </div>
        </div>

        {/* ── RECENT ACTIVITY ── */}
        <div className="pf-card">
          <h2 className="pf-card-title">Recent Activity</h2>
          <p className="pf-card-sub">Your latest interactions</p>

          {loading ? (
            <div className="pf-skel-activity">
              {[1,2,3,4,5].map(n => <div key={n} className="pf-skel-activity-row" />)}
            </div>
          ) : activity.length === 0 ? (
            <p className="pf-empty-msg">No activity yet. Start exploring!</p>
          ) : (
            <div className="pf-activity-list">
              {activity.map(item => (
                <div key={item.id} className="pf-activity-item">
                  <div className="pf-activity-img-wrap">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="pf-activity-img" />
                      : <div className="pf-activity-img-placeholder" />
                    }
                  </div>
                  <div className="pf-activity-info">
                    <span className="pf-activity-name">{item.name}</span>
                    <span className="pf-activity-city">{item.city}</span>
                  </div>
                  <div className="pf-activity-right">
                    <div className={`pf-activity-action ${item.interaction_type}`}>
                      {item.interaction_type === 'rating'   && <><Star  size={12} />{item.rating_value}/5</>}
                      {item.interaction_type === 'favorite' && <><Heart size={12} />Saved</>}
                      {item.interaction_type === 'visited'  && <><Check size={12} />Visited</>}
                    </div>
                    <span className="pf-activity-date">{formatDate(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── QUICK LINKS ── */}
        <div className="pf-card pf-links-card">
          <Link to="/saved" className="pf-link-row">
            <Bookmark size={16} color="#22c55e" />
            <span>Saved places</span>
            <span className="pf-link-arrow">→</span>
          </Link>
          <div className="pf-link-divider" />
          <Link to="/onboarding" className="pf-link-row">
            <Settings size={16} color="#22c55e" />
            <span>Edit preferences</span>
            <span className="pf-link-arrow">→</span>
          </Link>
        </div>

        {/* ── TASTE PROFILE ── */}
        <div className="pf-card">
          <div className="pf-card-head">
            <div>
              <h2 className="pf-card-title">Your Taste Profile</h2>
              <p className="pf-card-sub">Built from your ratings, saves and visits</p>
            </div>
            <div className={`pf-mode-badge${isHybrid ? ' hybrid' : ''}`}>
              {isHybrid ? <><Zap size={11} /> Hybrid AI</> : <><Brain size={11} /> Content Mode</>}
            </div>
          </div>

          {loading ? (
            <div className="pf-skeleton-bars">
              {[80, 60, 45, 30].map(w => <div key={w} className="pf-skel-bar" style={{ width: `${w}%` }} />)}
            </div>
          ) : sortedCats.length === 0 ? (
            <p className="pf-empty-msg">Rate a few places to build your taste profile.</p>
          ) : (
            <div className="pf-bars">
              {sortedCats.map(([cat, val]) => (
                <div key={cat} className="pf-bar-row">
                  <div className="pf-bar-labels">
                    <span className="pf-bar-name">{CAT_LABELS[cat] || cat}</span>
                    <span className="pf-bar-pct">{Math.round(val * 100)}%</span>
                  </div>
                  <div className="pf-bar-track">
                    <div
                      className="pf-bar-fill"
                      style={{
                        width: barsVisible ? `${Math.round(val * 100)}%` : '0%',
                        background: CAT_COLORS[cat] || '#22c55e',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && interactionCount > 0 && (
            <p className="pf-interaction-count">
              Built from {interactionCount} place{interactionCount !== 1 ? 's' : ''} interacted with
            </p>
          )}
        </div>

        {/* ── PRICE PREFERENCES ── */}
        {!loading && sortedPrices.length > 0 && (
          <div className="pf-card">
            <h2 className="pf-card-title">Price Preferences</h2>
            <p className="pf-card-sub">The price ranges you tend to enjoy</p>
            <div className="pf-price-grid">
              {sortedPrices.map(([level, val]) => (
                <div key={level} className="pf-price-tile"
                  style={{ borderColor: `${PRICE_COLORS[level]}44`, background: `${PRICE_COLORS[level]}11` }}>
                  <span className="pf-price-label" style={{ color: PRICE_COLORS[level] }}>
                    {PRICE_LABELS[level] || `Level ${level}`}
                  </span>
                  <span className="pf-price-pct">{Math.round(val * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
