// Combined discovery feed — AI-powered sections, mood filters, and place browser in one page

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Search, MapPin, Heart, Star, SlidersHorizontal, X, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import hiddenGemsImg from '../assets/images/hidden gems.jpg';
import './Discover.css';

const MOODS = [
  { label: '🔥 Trending',  value: 'trending' },
  { label: '🍽️ Food',      value: 'restaurant' },
  { label: '🌿 Chill',     value: 'park' },
  { label: '🎉 Nightlife', value: 'nightlife' },
  { label: '🎨 Culture',   value: 'culture' },
  { label: '🛍️ Shopping',  value: 'shopping' },
];

const CAT_COLORS = {
  restaurant:    '#f59e0b',
  bar:           '#6366f1',
  museum:        '#14b8a6',
  park:          '#22c55e',
  entertainment: '#ec4899',
  shopping:      '#f97316',
  attraction:    '#8b5cf6',
};

const CAT_PLURAL = {
  restaurant:    'restaurants',
  bar:           'bars',
  museum:        'museums',
  park:          'parks',
  entertainment: 'entertainment',
  shopping:      'shopping',
  attraction:    'attractions',
};

const FALLBACKS = {
  restaurant:    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  bar:           'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
  museum:        'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80',
  park:          'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80',
  entertainment: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  shopping:      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
  attraction:    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
};

const PRICE_LABELS = { 1: 'Budget', 2: 'Affordable', 3: 'Mid-range', 4: 'Premium' };
const UNLOCK_THRESHOLD = 5;

function imgFallback(cat) {
  return FALLBACKS[cat] || FALLBACKS.attraction;
}

function fmtCount(n) {
  if (!n) return null;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}


export default function Discover() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [recs, setRecs]                 = useState([]);
  const [places, setPlaces]             = useState([]);
  const [hiddenGems, setHiddenGems]     = useState([]);
  const [profile, setProfile]           = useState(null);
  const [favorites, setFavorites]       = useState(new Set());
  const [cities, setCities]             = useState([]);
  const [selectedCity, setSelectedCity] = useState('Dublin');
  const [activeMood, setActiveMood]     = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterOpen, setFilterOpen]     = useState(false);
  const [priceFilter, setPriceFilter]   = useState(null);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [cityDropOpen, setCityDropOpen] = useState(false);
  const [loading, setLoading]           = useState(true);

  const fetchData = useCallback(async (city) => {
    setLoading(true);
    try {
      const q = city ? `city=${encodeURIComponent(city)}&` : '';
      const [recsRes, placesRes, gemsRes] = await Promise.all([
        api.get(`/recommendations?${q}limit=20`),
        api.get(`/places?${q}limit=60`),
        api.get(`/places?${q}min_review_count=20&max_review_count=450&min_rating=4.2&limit=12`),
      ]);
      setRecs(recsRes.data.recommendations || []);
      setPlaces(placesRes.data.places || []);
      setHiddenGems(gemsRes.data.places || []);
    } catch {
      setRecs([]);
      setPlaces([]);
      setHiddenGems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    api.get('/places/stats')
      .then(res => setCities([...new Set((res.data.stats || []).map(s => s.city))].sort()))
      .catch(() => {});

    api.get('/interactions/my/favorites')
      .then(res => setFavorites(new Set((res.data.places || []).map(p => p.id))))
      .catch(() => {});

    api.get('/recommendations/profile')
      .then(res => setProfile(res.data.profile))
      .catch(() => {});

    fetchData('Dublin');
  }, [fetchData, user]);

  if (!user) return <Navigate to="/login" replace />;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function handleCityChange(city) {
    setSelectedCity(city);
    setCityDropOpen(false);
    fetchData(city);
  }

  async function toggleHeart(e, placeId) {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(placeId) ? next.delete(placeId) : next.add(placeId);
      return next;
    });
    try {
      await api.post(`/interactions/favorite/${placeId}`);
    } catch {
      setFavorites(prev => {
        const next = new Set(prev);
        next.has(placeId) ? next.delete(placeId) : next.add(placeId);
        return next;
      });
    }
  }

  function getFilteredFeed() {
    let result =
      activeMood === 'trending'  ? [...places].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0)) :
      activeMood === 'nightlife' ? places.filter(p => p.category === 'bar' || p.category === 'entertainment') :
      activeMood === 'culture'   ? places.filter(p => p.category === 'museum' || p.category === 'attraction') :
      activeMood                 ? places.filter(p => p.category === activeMood) :
      places;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    if (priceFilter) result = result.filter(p => p.price_level === priceFilter);

    return result;
  }

  // Determine the user's top category for the "Because you loved X" section
  const interactionCount = profile?.interactionCount || 0;
  const sortedCats       = Object.entries(profile?.categoryAffinities || {}).sort((a, b) => b[1] - a[1]);
  const topCat           = sortedCats[0]?.[0] || null;
  // Only show the section if the user has enough interactions and a clear top preference
  const showBecause      = interactionCount >= UNLOCK_THRESHOLD && topCat;
  const becausePlaces    = showBecause ? places.filter(p => p.category === topCat).slice(0, 12) : [];

  const forYouRecs       = recs.slice(0, 6);
  const mightLikeRecs    = recs.slice(6, 14);
  const trending         = [...places].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0)).slice(0, 12);

  const isFiltering  = activeMood !== null || searchQuery;
  const feedPlaces   = getFilteredFeed();
  const displayName  = user.username || user.email.split('@')[0];

  return (
    <div className="disc-page" onClick={() => { menuOpen && setMenuOpen(false); cityDropOpen && setCityDropOpen(false); }}>

      <nav className="disc-nav">
        <Link to="/" className="disc-logo">Urban <span>Explorer</span></Link>

        <div className="disc-nav-center">
          <div className="disc-search-wrap">
            <Search size={15} className="disc-search-icon" />
            <input
              className="disc-search"
              type="text"
              placeholder="Search places, vibes, cities…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="disc-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="disc-nav-right">
          <div className="disc-location" onClick={e => { e.stopPropagation(); setCityDropOpen(o => !o); }}>
            <MapPin size={13} />
            <span>{selectedCity || 'All Cities'}</span>
            <ChevronDown size={12} />
            {cityDropOpen && (
              <div className="disc-city-drop" onClick={e => e.stopPropagation()}>
                <button className={`disc-city-opt${!selectedCity ? ' active' : ''}`} onClick={() => handleCityChange('')}>All Cities</button>
                {cities.map(c => (
                  <button key={c} className={`disc-city-opt${selectedCity === c ? ' active' : ''}`} onClick={() => handleCityChange(c)}>{c}</button>
                ))}
              </div>
            )}
          </div>

          <button className="disc-filter-btn" onClick={e => { e.stopPropagation(); setFilterOpen(true); }}>
            <SlidersHorizontal size={15} />
          </button>

          <button className="disc-avatar" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}>
            {displayName[0].toUpperCase()}
          </button>

          {menuOpen && (
            <div className="disc-avatar-menu" onClick={e => e.stopPropagation()}>
              <div className="disc-avatar-name">{displayName}</div>
              <Link to="/profile" className="disc-avatar-link" onClick={() => setMenuOpen(false)}>
                <User size={13} /> Profile
              </Link>
              <button className="disc-avatar-logout" onClick={handleLogout}>
                <LogOut size={13} /> Log Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {filterOpen && (
        <div className="disc-modal-backdrop" onClick={() => setFilterOpen(false)}>
          <div className="disc-modal" onClick={e => e.stopPropagation()}>
            <div className="disc-modal-header">
              <h3>Filter</h3>
              <button onClick={() => setFilterOpen(false)}><X size={18} /></button>
            </div>
            <p className="disc-modal-label">Price range</p>
            <div className="disc-modal-prices">
              <button className={`disc-modal-price-btn${!priceFilter ? ' active' : ''}`} onClick={() => setPriceFilter(null)}>Any</button>
              {[1,2,3,4].map(level => (
                <button key={level} className={`disc-modal-price-btn${priceFilter === level ? ' active' : ''}`} onClick={() => setPriceFilter(level)}>
                  {PRICE_LABELS[level]}
                </button>
              ))}
            </div>
            <button className="disc-modal-apply" onClick={() => setFilterOpen(false)}>Apply</button>
          </div>
        </div>
      )}

      <div className="disc-body">

        <div className="disc-moods">
          {MOODS.map(mood => (
            <button
              key={mood.value}
              className={`disc-mood-chip${activeMood === mood.value ? ' active' : ''}`}
              onClick={() => setActiveMood(activeMood === mood.value ? null : mood.value)}
            >
              {mood.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="disc-skeletons">
            <div className="disc-skel-row">{[1,2,3].map(n => <div key={n} className="disc-skel-hero-card" />)}</div>
            <div className="disc-skel-grid">{[1,2,3,4].map(n => <div key={n} className="disc-skel-card" />)}</div>
          </div>
        ) : isFiltering ? (
          <>
            <p className="disc-results-count">{feedPlaces.length} places found</p>
            {feedPlaces.length === 0 ? (
              <div className="disc-empty">
                <p>Nothing matches this filter.</p>
                <button className="disc-empty-btn" onClick={() => { setActiveMood(null); setSearchQuery(''); }}>Clear filters</button>
              </div>
            ) : (
              <div className="disc-feed-grid">
                {feedPlaces.map(place => (
                  <FeedCard key={place.id} place={place} favorited={favorites.has(place.id)}
                    onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {forYouRecs.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-head">
                  <h2 className="disc-section-title">For You</h2>
                  <p className="disc-section-sub">Your top picks, ranked by the AI</p>
                </div>
                <div className="disc-hscroll">
                  {forYouRecs.map(place => (
                    <HeroCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {trending.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-head">
                  <h2 className="disc-section-title">🔥 Trending Now</h2>
                  <p className="disc-section-sub">Most visited spots right now</p>
                </div>
                <div className="disc-hscroll">
                  {trending.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {mightLikeRecs.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-head">
                  <h2 className="disc-section-title">You Might Like These</h2>
                  <p className="disc-section-sub">More places the model thinks you'd enjoy</p>
                </div>
                <div className="disc-hscroll">
                  {mightLikeRecs.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {showBecause && becausePlaces.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-head">
                  <h2 className="disc-section-title">Because you love {CAT_PLURAL[topCat] || topCat}</h2>
                  <p className="disc-section-sub">Places that match your most visited category</p>
                </div>
                <div className="disc-hscroll">
                  {becausePlaces.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {hiddenGems.length > 0 && (
              <section className="disc-section">
                <div className="disc-gems-banner">
                  <img src={hiddenGemsImg} alt="" className="disc-gems-banner-img" />
                  <div className="disc-gems-overlay" />
                  <div className="disc-gems-content">
                    <div className="disc-gems-eyebrow">💎 Hidden Gems</div>
                    <h2 className="disc-gems-headline">
                      {selectedCity || 'Dublin'}'s<br />best-kept secrets
                    </h2>
                    <p className="disc-gems-tagline">Highly rated · Rarely crowded</p>
                  </div>
                </div>
                <div className="disc-hscroll disc-gems-scroll">
                  {hiddenGems.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </div>
  );
}

function HeroCard({ place, favorited, onHeart, onClick }) {
  return (
    <div className="disc-hero-card" onClick={onClick}>
      <img src={place.image_url || imgFallback(place.category)} alt={place.name}
        className="disc-hero-card-img" onError={e => { e.target.src = imgFallback(place.category); }} />
      <div className="disc-hero-card-overlay" />
      {place.category && <span className="disc-cat-dot" style={{ background: CAT_COLORS[place.category] }} />}
      <button className={`disc-heart${favorited ? ' active' : ''}`} onClick={onHeart} aria-label="Toggle favourite">
        <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
      </button>
      <div className="disc-hero-card-bottom">
        <div className="disc-hero-card-name">{place.name}</div>
        <div className="disc-hero-card-meta">
          <span className="disc-info-item"><Star size={11} fill="currentColor" />{(parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0).toFixed(1)}</span>
          {fmtCount(place.google_review_count) && <span className="disc-review-count">{fmtCount(place.google_review_count)} reviews</span>}
        </div>
      </div>
    </div>
  );
}

function SmallCard({ place, favorited, onHeart, onClick }) {
  return (
    <div className="disc-small-card" onClick={onClick}>
      <img src={place.image_url || FALLBACKS[place.category] || FALLBACKS.attraction} alt={place.name}
        className="disc-small-card-img" onError={e => { e.target.src = FALLBACKS[place.category] || FALLBACKS.attraction; }} />
      <div className="disc-small-card-overlay" />
      {place.category && <span className="disc-cat-dot" style={{ background: CAT_COLORS[place.category] }} />}
      <button className={`disc-heart${favorited ? ' active' : ''}`} onClick={onHeart} aria-label="Toggle favourite">
        <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
      </button>
      <div className="disc-small-card-bottom">
        <div className="disc-small-card-name">{place.name}</div>
        <div className="disc-hero-card-meta">
          <span className="disc-info-item"><Star size={10} fill="currentColor" />{(parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0).toFixed(1)}</span>
          {fmtCount(place.google_review_count) && <span className="disc-review-count">{fmtCount(place.google_review_count)} reviews</span>}
        </div>
      </div>
    </div>
  );
}

function FeedCard({ place, favorited, onHeart, onClick }) {
  const tag = place.google_review_count > 1000 ? '🔥 Popular'
    : (parseFloat(place.google_rating) || 0) >= 4.5 ? '⭐ Top rated'
    : null;

  return (
    <div className="disc-feed-card" onClick={onClick}>
      <div className="disc-feed-card-img-wrap">
        <img src={place.image_url || FALLBACKS[place.category] || FALLBACKS.attraction} alt={place.name}
          className="disc-feed-card-img" onError={e => { e.target.src = FALLBACKS[place.category] || FALLBACKS.attraction; }} />
        {place.category && <span className="disc-cat-badge" style={{ background: CAT_COLORS[place.category] }}>{place.category.charAt(0).toUpperCase() + place.category.slice(1)}</span>}
        <button className={`disc-heart${favorited ? ' active' : ''}`} onClick={onHeart} aria-label="Toggle favourite">
          <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="disc-feed-card-body">
        <div className="disc-feed-card-top">
          <span className="disc-feed-card-name">{place.name}</span>
          {tag && <span className="disc-mood-tag">{tag}</span>}
        </div>
        <div className="disc-feed-card-meta">
          <span className="disc-info-item"><Star size={11} fill="currentColor" />{(parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0).toFixed(1)}</span>
          <span className="disc-info-item"><MapPin size={11} />{place.city}</span>
          {PRICE_LABELS[place.price_level] && <span className="disc-info-item">{PRICE_LABELS[place.price_level]}</span>}
          {fmtCount(place.google_review_count) && <span className="disc-social-proof">{fmtCount(place.google_review_count)} reviews</span>}
        </div>
      </div>
    </div>
  );
}
