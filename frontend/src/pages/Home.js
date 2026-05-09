// Landing page shown to all visitors before they sign in
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Star, Heart, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import api from '../services/api';
import heroImg from '../assets/images/heroimageday2.png';
import './Home.css';

const CATEGORIES = [
  { label: 'Adventure',          value: 'adventure' },
  { label: 'Indoor Fun',         value: 'indoor_activity' },
  { label: 'Outdoors',           value: 'outdoor_activity' },
  { label: 'Unique Experiences', value: 'unique_experience' },
  { label: 'Sports & Fitness',   value: 'sports_fitness' },
];

// Fallback images from Unsplash used when a place has no image stored in the database
const CATEGORY_FALLBACKS = {
  adventure:         'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80',
  indoor_activity:   'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400&q=80',
  outdoor_activity:  'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&q=80',
  unique_experience: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80',
  sports_fitness:    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
};

function placeFallback(category) {
  return CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.adventure;
}

function starDisplay(rating) {
  const r     = parseFloat(rating) || 0;
  const full  = Math.floor(r);
  const half  = r - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}


export default function Home() {
  useAuth();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('restaurant');
  const [searchQuery, setSearchQuery]       = useState('');
  const [popularPlaces, setPopularPlaces]   = useState([]);
  const [categoryImages, setCategoryImages] = useState({});
  const [loading, setLoading]               = useState(true);
  const [slideIndex, setSlideIndex]         = useState(0);
  const [catSlide, setCatSlide]             = useState(0);
  const [menuOpen, setMenuOpen]             = useState(false);

  useEffect(() => {
    // Fetch the most reviewed places to show in the Popular Locations carousel
    api.get('/places?limit=12')
      .then(res => setPopularPlaces(res.data.places || []))
      .catch(() => setPopularPlaces([]))
      .finally(() => setLoading(false));


    // Fetch one place per category so we can use its image as the category tile background
    Promise.all(
      CATEGORIES.map(cat =>
        api.get(`/places?category=${cat.value}&limit=1`)
          .then(res => ({ [cat.value]: res.data.places?.[0]?.image_url || null }))
          .catch(() => ({ [cat.value]: null }))
      )
    ).then(results => {
      setCategoryImages(Object.assign({}, ...results));
    });
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (activeCategory) params.set('category', activeCategory);
    navigate(`/places?${params.toString()}`);
  }

  return (
    <div className="home-page">

      <section className="hero">
        <img src={heroImg} alt="Urban Explorer hero" className="hero-bg" />
        <div className="hero-overlay" />

        <nav className="navbar">
          <Link to="/" className="navbar-logo">
            Urban <span>Explorer</span>
          </Link>

          <div className="navbar-auth">
            <Link to="/login" className="navbar-login">Log In</Link>
            <Link to="/register" className="navbar-signin">Sign Up</Link>
          </div>

          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="mobile-menu">
            <Link to="/login" className="mobile-menu-login" onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
            <Link to="/register" className="mobile-menu-signup" onClick={() => setMenuOpen(false)}>
              Sign Up
            </Link>
          </div>
        )}

        <div className="hero-headline">
          <h1 className="hero-title">
            Discover places<br />
            you'll actually <span className="hero-love">love</span>
          </h1>
          <p className="hero-subtitle">
            Personalized recommendations<br />
            based on your taste, not just popularity.
          </p>
        </div>

        <div className="hero-content">
          <div className="hero-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`hero-cat-btn ${activeCategory === cat.value ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <form className="hero-search" onSubmit={handleSearch}>
            <div className="hero-search-box" style={{ flex: 3 }}>
              <Search size={16} />
              <input
                type="text"
                placeholder={`Search ${CATEGORIES.find(c => c.value === activeCategory)?.label}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="hero-search-box" style={{ flex: 1 }}>
              <MapPin size={16} />
              <span className="city-select">Dublin</span>
            </div>
          </form>
        </div>

        <div className="hero-features">
          <div className="hero-feature">
            <div className="hero-feature-icon hero-feature-icon--amber">
              <Star size={20} fill="currentColor" />
            </div>
            <div>
              <div className="hero-feature-title">Curated for you</div>
              <div className="hero-feature-desc">Personalized picks you'll actually love</div>
            </div>
          </div>

          <div className="hero-feature-divider" />

          <div className="hero-feature">
            <div className="hero-feature-icon hero-feature-icon--purple">
              <MapPin size={20} fill="currentColor" />
            </div>
            <div>
              <div className="hero-feature-title">Explore nearby</div>
              <div className="hero-feature-desc">Find top-rated spots around you</div>
            </div>
          </div>

          <div className="hero-feature-divider" />

          <div className="hero-feature">
            <div className="hero-feature-icon hero-feature-icon--pink">
              <Heart size={20} fill="currentColor" />
            </div>
            <div>
              <div className="hero-feature-title">Loved by others</div>
              <div className="hero-feature-desc">Recommendations from real travelers</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Popular Locations</h2>
          <Link to="/places" className="show-all">Show all →</Link>
        </div>

        {loading ? (
          <div className="loading-row">
            <div className="skeleton" /><div className="skeleton" />
            <div className="skeleton" /><div className="skeleton" />
          </div>
        ) : (() => {
          const slides = [];
          for (let i = 0; i < popularPlaces.length; i += 4)
            slides.push(popularPlaces.slice(i, i + 4));
          return (
            <div className="places-carousel">
              <button
                className="carousel-btn carousel-btn--prev"
                onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
                disabled={slideIndex === 0}
              ><ChevronLeft size={20} /></button>

              <div className="places-track-wrap">
                <div className="places-track" style={{ transform: `translateX(${slideIndex * -100}%)` }}>
                  {slides.map((slide, si) => (
                    <div key={si} className="places-slide">
                      {slide.map(place => (
                        <div key={place.id} className="place-card" onClick={() => navigate(`/places/${place.id}`)}>
                          <img
                            src={place.image_url || placeFallback(place.category)}
                            alt={place.name}
                            className="place-card-img"
                            onError={e => { e.target.src = placeFallback(place.category); }}
                          />
                          <div className="place-card-overlay" />
                          <div className="place-card-body">
                            <div className="place-card-name">{place.name}</div>
                            <div className="place-card-desc">
                              {place.category ? place.category.charAt(0).toUpperCase() + place.category.slice(1) : ''}
                            </div>
                            <div className="place-card-badges">
                              <span className="badge">
                                <span className="stars">{starDisplay(place.average_rating || place.google_rating)}</span>
                                {(parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0).toFixed(1)}
                              </span>
                              {place.open_now && <span className="badge badge--open">Open now</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="carousel-btn carousel-btn--next"
                onClick={() => setSlideIndex(i => Math.min(slides.length - 1, i + 1))}
                disabled={slideIndex === slides.length - 1}
              ><ChevronRight size={20} /></button>

            </div>
          );
        })()}
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">Categories</h2>
        </div>
        {(() => {
          const catSlides = [];
          for (let i = 0; i < CATEGORIES.length; i += 4)
            catSlides.push(CATEGORIES.slice(i, i + 4));
          return (
            <div className="places-carousel">
              <button
                className="carousel-btn carousel-btn--prev"
                onClick={() => setCatSlide(i => Math.max(0, i - 1))}
                disabled={catSlide === 0}
              ><ChevronLeft size={20} /></button>

              <div className="places-track-wrap">
                <div className="places-track" style={{ transform: `translateX(${catSlide * -100}%)` }}>
                  {catSlides.map((slide, si) => (
                    <div key={si} className="cats-slide">
                      {slide.map(cat => (
                        <div
                          key={cat.value}
                          className="cat-tile"
                          onClick={() => navigate(`/places?category=${cat.value}`)}
                        >
                          <img
                            src={categoryImages[cat.value] || CATEGORY_FALLBACKS[cat.value]}
                            alt={cat.label}
                            onError={e => { e.target.src = CATEGORY_FALLBACKS[cat.value]; }}
                          />
                          <div className="cat-tile-overlay">
                            <span className="cat-tile-label">{cat.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="carousel-btn carousel-btn--next"
                onClick={() => setCatSlide(i => Math.min(catSlides.length - 1, i + 1))}
                disabled={catSlide === catSlides.length - 1}
              ><ChevronRight size={20} /></button>
            </div>
          );
        })()}
      </section>

      

      <footer className="footer">
        ©Copyright Griffith College Dublin – Saviour Apkan
      </footer>
    </div>
  );
}
