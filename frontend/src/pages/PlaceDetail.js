import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, X, Heart, MapPin, Star, Share2, Check, ExternalLink, Phone, Zap, Leaf, Mountain, Trophy, Sparkles, Palette, Users, User, ChevronLeft, ChevronRight, FolderPlus, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './PlaceDetail.css';

const CAT_COLORS = {
  adventure:         '#ef4444',
  indoor_activity:   '#6366f1',
  outdoor_activity:  '#22c55e',
  unique_experience: '#8b5cf6',
  sports_fitness:    '#f59e0b',
};

const PRICE_LABEL = { 1: 'Free', 2: 'Budget', 3: 'Mid-range', 4: 'Premium' };


const WHY_LOVE_MAP = [
  { tag: 'group activity',    Icon: Users,    title: 'Great for groups',    desc: 'Perfect to enjoy with your crew.'            },
  { tag: 'date night',        Icon: Heart,    title: 'Romantic',            desc: 'A great choice for a special evening.'       },
  { tag: 'solo adventure',    Icon: User,     title: 'Solo friendly',       desc: 'Easy to enjoy entirely on your own terms.'  },
  { tag: 'high energy',       Icon: Zap,      title: 'High energy',         desc: 'Get your adrenaline pumping.'                },
  { tag: 'chill',             Icon: Leaf,     title: 'Relaxed vibe',        desc: 'Unwind and take it at your own pace.'        },
  { tag: 'skill-based',       Icon: Trophy,   title: 'Learn a new skill',   desc: 'Take something new home with you.'           },
  { tag: 'birthday activity', Icon: Sparkles, title: 'Birthday worthy',     desc: 'Perfect for celebrating someone special.'    },
  { tag: 'outdoor',           Icon: Mountain, title: 'Get outside',         desc: 'Fresh air and great scenery await.'          },
  { tag: 'immersive',         Icon: Sparkles, title: 'Fully immersive',     desc: 'Lose yourself completely in the experience.' },
  { tag: 'craft experience',  Icon: Palette,  title: 'Hands-on creative',   desc: 'Make something you can take home.'           },
  { tag: 'wellness',          Icon: Leaf,     title: 'Good for the mind',   desc: 'Reset and recharge properly.'                },
  { tag: 'scenic routes',     Icon: Mountain, title: 'Stunning scenery',    desc: 'Views worth the trip on their own.'          },
];

export default function PlaceDetail({ modalId, onClose }) {
  const params  = useParams();
  const id      = modalId || params.id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [place, setPlace]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [photoIndex, setPhotoIndex]     = useState(0);
  const [favorited, setFavorited]       = useState(false);
  const [visited, setVisited]           = useState(false);
  const [userRating, setUserRating]     = useState(null);
  const [hoverRating, setHoverRating]   = useState(null);
  const [ratingLoading, setRatingLoading]   = useState(false);
  const [collOpen, setCollOpen]             = useState(false);
  const [collections, setCollections]       = useState([]);
  const [collLoaded, setCollLoaded]         = useState(false);
  const [inCollections, setInCollections]   = useState(new Set());
  const [newCollName, setNewCollName]       = useState('');
  const [collCreating, setCollCreating]     = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [placeRes, interRes] = await Promise.all([
          api.get(`/places/${id}`),
          api.get(`/interactions/place/${id}`),
        ]);
        setPlace(placeRes.data.place);
        const inter = interRes.data.interactions || {};
        setFavorited(inter.favorited || false);
        setVisited(inter.visited || false);
        setUserRating(inter.rating || null);
      } catch {
        setPlace(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (!user && !onClose) return <Navigate to="/login" replace />;
  if (loading) return <div className="pd-loading"><div className="pd-spinner" /></div>;
  if (!place)  return <div className="pd-not-found"><p>Place not found.</p><button onClick={() => navigate(-1)}>Go back</button></div>;

  const photos    = place.photo_urls?.length ? place.photo_urls : place.image_url ? [place.image_url] : [];
  const heroImg   = photos[photoIndex] || null;
  const catColor  = CAT_COLORS[place.category] || '#22c55e';
  const rating    = parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0;
  const whyLove   = WHY_LOVE_MAP.filter(w => place.tags?.includes(w.tag)).slice(0, 3);

  const badge = place.google_review_count > 800 ? '🔥 Popular'
    : (parseFloat(place.google_rating) >= 4.5 && (place.google_review_count || 0) < 400) ? '💎 Hidden Gem'
    : null;

  async function toggleFavorite() {
    setFavorited(prev => !prev);
    try { await api.post(`/interactions/favorite/${id}`); }
    catch { setFavorited(prev => !prev); }
  }

  async function toggleVisited() {
    setVisited(prev => !prev);
    try { await api.post(`/interactions/visited/${id}`); }
    catch { setVisited(prev => !prev); }
  }

  async function handleRating(star) {
    setRatingLoading(true);
    try {
      if (userRating === star) {
        await api.delete(`/interactions/rate/${id}`);
        setUserRating(null);
      } else {
        await api.post('/interactions/rate', { placeId: parseInt(id), rating: star });
        setUserRating(star);
      }
    } catch {}
    finally { setRatingLoading(false); }
  }

  async function openCollections() {
    setCollOpen(o => !o);
    if (collLoaded) return;
    try {
      const [collRes, inRes] = await Promise.all([
        api.get('/collections'),
        api.get(`/collections/place/${id}`),
      ]);
      setCollections(collRes.data.collections || []);
      setInCollections(new Set(inRes.data.collectionIds || []));
      setCollLoaded(true);
    } catch {}
  }

  async function toggleCollection(collId) {
    const isIn = inCollections.has(collId);
    setInCollections(prev => {
      const next = new Set(prev);
      isIn ? next.delete(collId) : next.add(collId);
      return next;
    });
    try {
      if (isIn) await api.delete(`/collections/${collId}/places/${id}`);
      else       await api.post(`/collections/${collId}/places/${id}`);
    } catch {
      setInCollections(prev => {
        const next = new Set(prev);
        isIn ? next.add(collId) : next.delete(collId);
        return next;
      });
    }
  }

  async function createCollection() {
    if (!newCollName.trim()) return;
    setCollCreating(true);
    try {
      const res = await api.post('/collections', { name: newCollName.trim() });
      const newCol = res.data.collection;
      setCollections(prev => [{ ...newCol, place_count: 0 }, ...prev]);
      setNewCollName('');
      await api.post(`/collections/${newCol.id}/places/${id}`);
      setInCollections(prev => new Set([...prev, newCol.id]));
    } catch {}
    finally { setCollCreating(false); }
  }

  return (
    <div className="pd-page">

      {/* Hero */}
      <div className="pd-hero">
        {heroImg && <img src={heroImg} alt={place.name} className="pd-hero-img" />}
        <div className="pd-hero-overlay" />

        <button className="pd-back" onClick={onClose ? onClose : () => navigate(-1)}>
          {onClose ? <X size={20} /> : <ArrowLeft size={20} />}
        </button>

        <div className="pd-hero-top-right">
          <button className={`pd-hero-btn${favorited ? ' active' : ''}`} onClick={toggleFavorite}>
            <Heart size={18} fill={favorited ? 'currentColor' : 'none'} />
          </button>
          <button className="pd-hero-btn">
            <Share2 size={18} />
          </button>
        </div>

        {badge && <span className="pd-hero-badge">{badge}</span>}

        {photos.length > 1 && (
          <>
            <button className="pd-gallery-arrow pd-gallery-prev"
              onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}>
              <ChevronLeft size={18} />
            </button>
            <button className="pd-gallery-arrow pd-gallery-next"
              onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}>
              <ChevronRight size={18} />
            </button>
            <div className="pd-gallery-dots">
              {photos.map((_, i) => (
                <button key={i} className={`pd-gallery-dot${i === photoIndex ? ' active' : ''}`}
                  onClick={() => setPhotoIndex(i)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Body */}
      <div className="pd-body">

        {/* Left — main info */}
        <div className="pd-main">

          <div className="pd-cat-label" style={{ color: catColor }}>
            {place.subcategory?.replace(/_/g, ' ')}
          </div>

          <h1 className="pd-name">{place.name}</h1>

          {place.address && (
            <div className="pd-address">
              <MapPin size={13} />
              <span>{place.address}</span>
            </div>
          )}

          <div className="pd-rating-row">
            <Star size={14} fill="#f59e0b" color="#f59e0b" />
            <span className="pd-rating-val">{rating.toFixed(1)}</span>
            {place.google_review_count > 0 && (
              <span className="pd-review-count">({place.google_review_count.toLocaleString()} reviews)</span>
            )}
            {rating >= 4.5 && <span className="pd-highly-rated">Highly rated</span>}
          </div>

          {place.description && <p className="pd-desc">{place.description}</p>}

          {place.tags?.length > 0 && (
            <div className="pd-tags">
              {place.tags.slice(0, 6).map(tag => (
                <span key={tag} className="pd-tag">{tag}</span>
              ))}
            </div>
          )}

          {whyLove.length > 0 && (
            <div className="pd-why">
              <h3 className="pd-section-title">Why you'll love it</h3>
              <div className="pd-why-grid">
                {whyLove.map(({ Icon, title, desc }) => (
                  <div key={title} className="pd-why-item">
                    <div className="pd-why-icon" style={{ background: catColor + '22' }}>
                      <Icon size={18} color={catColor} />
                    </div>
                    <div>
                      <div className="pd-why-title">{title}</div>
                      <div className="pd-why-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pd-rate-section">
            <h3 className="pd-section-title">Rate this place</h3>
            <div className="pd-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} className="pd-star-btn" disabled={ratingLoading}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => handleRating(star)}>
                  <Star size={30}
                    fill={(hoverRating || userRating) >= star ? '#f59e0b' : 'none'}
                    color={(hoverRating || userRating) >= star ? '#f59e0b' : '#374151'} />
                </button>
              ))}
            </div>
            {userRating && <p className="pd-rated-label">You rated this {userRating} / 5</p>}
          </div>

        </div>

        {/* Right — action card */}
        <div className="pd-action-card">

          {place.price_level && (
            <div className="pd-price-row">
              <span className="pd-price-value">{PRICE_LABEL[place.price_level]}</span>
              <span className="pd-price-label">price range</span>
            </div>
          )}

          {place.google_maps_url && (
            <a href={place.google_maps_url} target="_blank" rel="noreferrer" className="pd-cta-btn">
              <MapPin size={15} /> Get directions
            </a>
          )}

          <button className={`pd-save-btn${favorited ? ' active' : ''}`} onClick={toggleFavorite}>
            <Heart size={15} fill={favorited ? 'currentColor' : 'none'} />
            {favorited ? 'Saved' : 'Save for later'}
          </button>

          <button className={`pd-visited-btn${visited ? ' active' : ''}`} onClick={toggleVisited}>
            <Check size={15} />
            {visited ? 'Visited' : 'Mark as visited'}
          </button>

          <div className="pd-collection-wrap">
            <button className="pd-collection-btn" onClick={openCollections}>
              <FolderPlus size={15} />
              Add to collection
            </button>

            {collOpen && (
              <div className="pd-collection-panel">
                {!collLoaded ? (
                  <div className="pd-coll-spinner" />
                ) : (
                  <>
                    {collections.length === 0 && (
                      <p className="pd-coll-empty">No collections yet.</p>
                    )}
                    {collections.map(col => (
                      <button key={col.id} className="pd-coll-item" onClick={() => toggleCollection(col.id)}>
                        <div className={`pd-coll-check${inCollections.has(col.id) ? ' active' : ''}`}>
                          {inCollections.has(col.id) && <Check size={10} />}
                        </div>
                        <span className="pd-coll-name">{col.name}</span>
                        <span className="pd-coll-count">{col.place_count}</span>
                      </button>
                    ))}
                    <div className="pd-coll-new">
                      <input
                        className="pd-coll-input"
                        placeholder="New collection…"
                        value={newCollName}
                        onChange={e => setNewCollName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createCollection()}
                      />
                      <button className="pd-coll-add-btn" onClick={createCollection} disabled={collCreating}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {Array.isArray(place.hours) && place.hours.length > 0 && (() => {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            return (
              <div className="pd-hours">
                <div className="pd-hours-title">Opening Hours</div>
                {place.hours.map(line => {
                  const [day, time] = line.split(': ');
                  const isToday = day === today;
                  return (
                    <div key={day} className={`pd-hours-row${isToday ? ' today' : ''}`}>
                      <span className="pd-hours-day">{day}</span>
                      <span className="pd-hours-time">{time || 'Closed'}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="pd-card-divider" />

          <div className="pd-meta-list">
            {place.phone && (
              <div className="pd-meta-item">
                <Phone size={13} />
                <a href={`tel:${place.phone}`} className="pd-meta-link">{place.phone}</a>
              </div>
            )}
            {place.website && (
              <div className="pd-meta-item">
                <ExternalLink size={13} />
                <a href={place.website} target="_blank" rel="noreferrer" className="pd-meta-link">Visit website</a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
