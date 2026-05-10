// Combined discovery feed — AI-powered sections, mood filters, and place browser in one page

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Search, MapPin, Heart, Star, SlidersHorizontal, X, LogOut, User, ChevronDown, Compass, Bookmark, Settings, Sparkles, Gamepad2, Mountain, Zap, Gift, Trophy, ChevronLeft, ChevronRight, Leaf, Palette, Users, ArrowRight } from 'lucide-react';
import campfireImg from '../assets/images/campfire.png';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Discover.css';

const VIBES = [
  { label: 'Adrenaline',       sub: 'Get your heart racing', Icon: Zap,      color: '#f59e0b', cat: 'adventure'         },
  { label: 'Chill',            sub: 'Relax & unwind',        Icon: Leaf,     color: '#290fa1', cat: 'indoor_activity'   },
  { label: 'Creative',         sub: 'Make something',        Icon: Palette,  color: '#ec4899', cat: 'unique_experience' },
  { label: 'Fun with friends', sub: 'Group activities',      Icon: Users,    color: '#60a5fa', cat: 'adventure'         },
  { label: 'Outdoor',          sub: 'Get in nature',         Icon: Mountain, color: '#22c55e', cat: 'outdoor_activity'  },
  { label: 'Unique',           sub: 'One of a kind',         Icon: Sparkles, color: '#a855f7', cat: 'unique_experience' },
];

const COLLECTIONS = [
  { label: 'Rainy Day Activities', sub: 'Best ways to beat the rain indoors',   ideas: 12, cat: 'indoor_activity',   bg: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&q=80' },
  { label: 'Date Night Ideas',     sub: 'Romantic experiences for two',         ideas: 8,  cat: 'unique_experience', bg: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80' },
  { label: 'Free Things to Do',    sub: 'Great experiences that cost nothing',  ideas: 15, cat: 'outdoor_activity',  bg: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80' },
  { label: 'Group Activities',     sub: 'Get the whole crew together',          ideas: 10, cat: 'adventure',         bg: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80' },
  { label: 'Birthday Ideas',       sub: 'Make it a day to remember',            ideas: 9,  cat: 'adventure',         bg: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80' },
  { label: 'Adrenaline Rush',      sub: 'For those who live on the edge',       ideas: 7,  cat: 'adventure',         bg: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80' },
  { label: 'Competitive Fun',      sub: 'May the best person win',              ideas: 8,  cat: 'sports_fitness',    bg: 'https://images.unsplash.com/photo-1545809074-59472b3f5ecc?w=800&q=80' },
  { label: 'Creative Experiences', sub: 'Make something with your hands',       ideas: 6,  cat: 'unique_experience', bg: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80' },
  { label: 'Open Late',            sub: 'Still going after midnight',           ideas: 10, cat: 'indoor_activity',   bg: 'https://images.unsplash.com/photo-1514565131-fce0801e6785?w=800&q=80' },
  { label: 'Sunset Spots',         sub: 'Golden hour views worth chasing',      ideas: 6,  cat: 'outdoor_activity',  bg: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80' },
  { label: 'Hidden Gems',          sub: 'Highly rated · Rarely crowded',        ideas: 11, cat: 'unique_experience', bg: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80' },
];

const CATEGORIES = [
  { label: 'For You',   value: null,                Icon: Sparkles, color: '#22c55e' },
  { label: 'Indoor',    value: 'indoor_activity',   Icon: Gamepad2, color: '#a855f7' },
  { label: 'Outdoor',   value: 'outdoor_activity',  Icon: Mountain, color: '#f59e0b' },
  { label: 'Adventure', value: 'adventure',         Icon: Zap,      color: '#f97316' },
  { label: 'Unique',    value: 'unique_experience', Icon: Gift,     color: '#60a5fa' },
  { label: 'Sports',    value: 'sports_fitness',    Icon: Trophy,   color: '#f97316' },
];

const CAT_COLORS = {
  adventure:         '#ef4444',
  indoor_activity:   '#6366f1',
  outdoor_activity:  '#22c55e',
  unique_experience: '#8b5cf6',
  sports_fitness:    '#f59e0b',
};

const CAT_PLURAL = {
  adventure:         'adventure',
  indoor_activity:   'indoor activities',
  outdoor_activity:  'outdoor activities',
  unique_experience: 'unique experiences',
  sports_fitness:    'sports & fitness',
};

const FALLBACKS = {
  adventure:         'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
  indoor_activity:   'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&q=80',
  outdoor_activity:  'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80',
  unique_experience: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  sports_fitness:    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
};

const FAMILY_TAGS = [
  'bowling', 'laser tag', 'arcade', 'mini golf', 'VR gaming',
  'skating', 'ice skating', 'trampoline', 'escape room',
  'aquarium', 'family friendly', 'inflatable park',
  'ninja warrior', 'go karting', 'obstacle course',
];

const UNLOCK_THRESHOLD = 5;

function imgFallback(cat) {
  return FALLBACKS[cat] || FALLBACKS.unique_experience;
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
  const [profile, setProfile]           = useState(null);
  const [favorites, setFavorites]       = useState(new Set());
  const [cities, setCities]             = useState([]);
  const [selectedCity, setSelectedCity] = useState('Dublin');
  const [activeMood, setActiveMood]     = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterOpen, setFilterOpen]     = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [cityDropOpen, setCityDropOpen] = useState(false);
  const [loading, setLoading]           = useState(true);

  const forYouRef   = useRef(null);
  const trendingRef = useRef(null);
  const familyRef       = useRef(null);
  const friendsRef      = useRef(null);
  const collectionsRef  = useRef(null);

  function scroll(ref, dir) {
    if (ref.current) ref.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
  }

  const fetchData = useCallback(async (city) => {
    setLoading(true);
    try {
      const q = city ? `city=${encodeURIComponent(city)}&` : '';
      const [recsRes, placesRes] = await Promise.all([
        api.get(`/recommendations?${q}limit=20`),
        api.get(`/places?${q}limit=200`),
      ]);
      setRecs(recsRes.data.recommendations || []);
      setPlaces(placesRes.data.places || []);
    } catch {
      setRecs([]);
      setPlaces([]);
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
      activeMood === 'trending' ? [...places].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0)) :
      activeMood                ? places.filter(p => p.category === activeMood) :
      places;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }


    return result;
  }

  // Determine the user's top category for the "Because you loved X" section
  const interactionCount = profile?.interactionCount || 0;
  const sortedCats       = Object.entries(profile?.categoryAffinities || {}).sort((a, b) => b[1] - a[1]);
  const topCat           = sortedCats[0]?.[0] || null;
  // Only show the section if the user has enough interactions and a clear top preference
  const showBecause      = interactionCount >= UNLOCK_THRESHOLD && topCat;
  const becausePlaces    = showBecause ? places.filter(p => p.category === topCat).slice(0, 12) : [];

  const forYouRecs       = recs.slice(0, 8);
  const mightLikeRecs    = recs.slice(8, 16);
  const trending         = [...places].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0)).slice(0, 10);
  const familyPlaces = (() => {
    const arr = [...places.filter(p => p.tags?.some(t => FAMILY_TAGS.includes(t)))];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 12);
  })();

  const friendsPlaces = (() => {
    const arr = [...places.filter(p => p.tags?.includes('group activity'))];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 12);
  })();

  const isFiltering  = activeMood !== null || searchQuery;
  const feedPlaces   = getFilteredFeed();
  const displayName  = user.username || user.email.split('@')[0];

  return (
    <div className="disc-layout">

      {/* SIDEBAR */}
      <aside className="disc-sidebar">
        <div className="disc-sidebar-logo">Urban <span>Explorer</span></div>

        <nav className="disc-sidebar-nav">
          <Link to="/discover" className="disc-sidebar-item active">
            <Compass size={18} />
            <span>Discover</span>
          </Link>
          <Link to="/saved" className="disc-sidebar-item">
            <Bookmark size={18} />
            <span>Saved</span>
          </Link>
          <Link to="/profile" className="disc-sidebar-item">
            <User size={18} />
            <span>Profile</span>
          </Link>
          <Link to="/settings" className="disc-sidebar-item">
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="disc-sidebar-promo" style={{ backgroundImage: `url(${campfireImg})` }}>
          <div className="disc-sidebar-promo-overlay" />
          <p className="disc-sidebar-promo-text">
            Let's make your weekend{' '}
            <span className="disc-sidebar-promo-highlight">unforgettable</span>
          </p>
        </div>

        <div className="disc-sidebar-user">
          <div className="disc-sidebar-avatar">{displayName[0].toUpperCase()}</div>
          <div className="disc-sidebar-user-info">
            <div className="disc-sidebar-user-name">{displayName}</div>
            <div className="disc-sidebar-user-sub">View profile</div>
          </div>
        </div>
      </aside>

    <div className="disc-page" onClick={() => { menuOpen && setMenuOpen(false); cityDropOpen && setCityDropOpen(false); }}>

      <nav className="disc-nav">
        <div className="disc-nav-heading">
          <div className="disc-nav-heading-title">Discover</div>
          <div className="disc-nav-heading-sub">amazing <span>things to do</span></div>
        </div>

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
            <button className="disc-search-filter" onClick={e => { e.stopPropagation(); setFilterOpen(true); }}>
              <SlidersHorizontal size={14} />
            </button>
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
            <button className="disc-modal-apply" onClick={() => setFilterOpen(false)}>Apply</button>
          </div>
        </div>
      )}

      <div className="disc-body">

        <div className="disc-cat-circles">
          {CATEGORIES.map(({ label, value, Icon, color }) => {
            const isActive = activeMood === value;
            return (
              <button
                key={label}
                className={`disc-cat-circle-btn${isActive ? ' active' : ''}`}
                onClick={() => setActiveMood(value)}
              >
                <div className="disc-cat-circle-icon" style={isActive ? { borderColor: color } : {}}>
                  <Icon size={26} color={color} />
                </div>
                <span className="disc-cat-circle-label">{label}</span>
              </button>
            );
          })}
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
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">✨Personalized for you</h2>
                    <p className="disc-section-sub">Your top picks, ranked by the AI</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(forYouRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(forYouRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={forYouRef}>
                  {forYouRecs.map((place, i) => (
                    <PersonalizedCard key={place.id} place={place} index={i} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {trending.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">🔥Trending now</h2>
                    <p className="disc-section-sub">Most visited spots right now</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(trendingRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(trendingRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={trendingRef}>
                  {trending.map((place, i) => (
                    <TrendingCard key={place.id} place={place} rank={i + 1} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {familyPlaces.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">👨‍👩‍👧 Family Fun Time</h2>
                    <p className="disc-section-sub">Great activities for all ages</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(familyRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(familyRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={familyRef}>
                  {familyPlaces.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            <section className="disc-section">
              <div className="disc-section-action-head">
                <div>
                  <h2 className="disc-section-title">Explore by vibe</h2>
                  <p className="disc-section-sub">Find something that matches your mood</p>
                </div>
                <button className="disc-see-all" onClick={() => {}}>See all <ArrowRight size={13} /></button>
              </div>
              <div className="disc-vibes-grid">
                {VIBES.map(({ label, sub, Icon, color, cat }) => (
                  <button key={label} className="disc-vibe-pill" onClick={() => setActiveMood(cat)}>
                    <div className="disc-vibe-icon" style={{ background: color + '22' }}>
                      <Icon size={20} color={color} />
                    </div>
                    <div className="disc-vibe-text">
                      <span className="disc-vibe-label">{label}</span>
                      <span className="disc-vibe-sub">{sub}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {friendsPlaces.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">👥 Perfect for Friends</h2>
                    <p className="disc-section-sub">Group activities worth getting the crew together for</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(friendsRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(friendsRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={friendsRef}>
                  {friendsPlaces.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => navigate(`/places/${place.id}`)} />
                  ))}
                </div>
              </section>
            )}

            <section className="disc-section">
              <div className="disc-section-action-head">
                <div>
                  <h2 className="disc-section-title">Collections</h2>
                  <p className="disc-section-sub">Curated lists for every occasion</p>
                </div>
                <div className="disc-scroll-arrows">
                  <button className="disc-arrow-btn" onClick={() => scroll(collectionsRef, -1)}><ChevronLeft size={16} /></button>
                  <button className="disc-arrow-btn" onClick={() => scroll(collectionsRef, 1)}><ChevronRight size={16} /></button>
                </div>
              </div>
              <div className="disc-hscroll" ref={collectionsRef}>
                {COLLECTIONS.map(({ label, sub, ideas, cat, bg }) => (
                  <button key={label} className="disc-collection-card" onClick={() => setActiveMood(cat)}
                    style={{ backgroundImage: `url(${bg})` }}>
                    <div className="disc-collection-overlay" />
                    <div className="disc-collection-text">
                      <span className="disc-collection-label">{label}</span>
                      <span className="disc-collection-sub">{sub}</span>
                      <span className="disc-collection-count">{ideas} ideas</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

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

          </>
        )}

      </div>
    </div>
    </div>
  );
}

const PERSONAL_TAGS = [
  { check: p => (p.google_review_count || 0) > 800,                           label: '🔥 Trending'           },
  { check: p => (parseFloat(p.google_rating) || 0) >= 4.5 && (p.google_review_count || 0) < 400, label: '💎 Hidden Gem' },
  { check: p => ['adventure', 'sports_fitness'].includes(p.category),          label: '👥 Perfect for Friends' },
  { check: p => p.category === 'unique_experience',                            label: '✨ One of a Kind'       },
  { check: p => p.category === 'outdoor_activity',                             label: '🌿 Get Outside'         },
];

function PersonalizedCard({ place, index, favorited, onHeart, onClick }) {
  const tags = PERSONAL_TAGS.filter(t => t.check(place)).slice(0, 2).map(t => t.label);
  return (
    <div className="disc-personal-card" onClick={onClick}>
      <img src={place.image_url || imgFallback(place.category)} alt={place.name}
        className="disc-personal-card-img" onError={e => { e.target.src = imgFallback(place.category); }} />
      <div className="disc-personal-card-overlay" />
      <div className="disc-personal-card-tags">
        {tags.map(t => <span key={t} className="disc-personal-tag">{t}</span>)}
      </div>
      <button className={`disc-heart${favorited ? ' active' : ''}`} onClick={onHeart} aria-label="Toggle favourite">
        <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
      </button>
      <div className="disc-personal-card-bottom">
        {place.category && <span className="disc-cat-badge-sm" style={{ background: CAT_COLORS[place.category] }}>{place.category.replace('_', ' ')}</span>}
        <div className="disc-personal-card-name">{place.name}</div>
        <div className="disc-hero-card-meta">
          <span className="disc-info-item"><Star size={10} fill="currentColor" />{(parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0).toFixed(1)}</span>
          {fmtCount(place.google_review_count) && <span className="disc-review-count">{fmtCount(place.google_review_count)} reviews</span>}
        </div>
      </div>
    </div>
  );
}

function TrendingCard({ place, rank, favorited, onHeart, onClick }) {
  return (
    <div className="disc-trending-card" onClick={onClick}>
      <img src={place.image_url || imgFallback(place.category)} alt={place.name}
        className="disc-trending-card-img" onError={e => { e.target.src = imgFallback(place.category); }} />
      <div className="disc-trending-card-overlay" />
      <div className="disc-trending-rank">{rank}</div>
      <button className={`disc-heart${favorited ? ' active' : ''}`} onClick={onHeart} aria-label="Toggle favourite">
        <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
      </button>
      <div className="disc-trending-card-bottom">
        <div className="disc-trending-card-name">{place.name}</div>
        <div className="disc-hero-card-meta">
          <span className="disc-info-item"><Star size={10} fill="currentColor" />{(parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0).toFixed(1)}</span>
          {fmtCount(place.google_review_count) && <span className="disc-review-count">{fmtCount(place.google_review_count)} reviews</span>}
        </div>
      </div>
    </div>
  );
}

function SmallCard({ place, favorited, onHeart, onClick }) {
  return (
    <div className="disc-small-card" onClick={onClick}>
      <img src={place.image_url || imgFallback(place.category)} alt={place.name}
        className="disc-small-card-img" onError={e => { e.target.src = imgFallback(place.category); }} />
      <div className="disc-small-card-overlay" />
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
        <img src={place.image_url || imgFallback(place.category)} alt={place.name}
          className="disc-feed-card-img" onError={e => { e.target.src = imgFallback(place.category); }} />
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
          {fmtCount(place.google_review_count) && <span className="disc-social-proof">{fmtCount(place.google_review_count)} reviews</span>}
        </div>
      </div>
    </div>
  );
}
