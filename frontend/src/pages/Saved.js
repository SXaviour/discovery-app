import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Search, MapPin, Star, Bookmark, Compass, User, Settings, Check, Folder, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import campfireImg from '../assets/images/campfire.png';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PlaceDetail from './PlaceDetail';
import './Saved.css';


function getBadge(place) {
  if ((place.google_review_count || 0) > 800) return '🔥 Popular';
  if ((parseFloat(place.google_rating) || 0) >= 4.5 && (place.google_review_count || 0) < 400) return '💎 Hidden Gem';
  if (place.tags?.includes('group activity')) return '👥 Perfect for Friends';
  return null;
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = ['saved', 'visited', 'collections'];

export default function Saved() {
  const { user } = useAuth();

  const [activeTab, setActiveTab]             = useState('saved');
  const [saved, setSaved]                     = useState([]);
  const [visited, setVisited]                 = useState([]);
  const [collections, setCollections]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [expandedColl, setExpandedColl]       = useState(null);
  const [expandedPlaces, setExpandedPlaces]   = useState([]);
  const [expandLoading, setExpandLoading]     = useState(false);
  const [createOpen, setCreateOpen]           = useState(false);
  const [newCollName, setNewCollName]         = useState('');
  const [creating, setCreating]               = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [savedRes, visitedRes, collRes] = await Promise.all([
          api.get('/interactions/my/favorites'),
          api.get('/interactions/my/visited'),
          api.get('/collections'),
        ]);
        setSaved(savedRes.data.places || []);
        setVisited(visitedRes.data.places || []);
        setCollections(collRes.data.collections || []);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  async function openCollection(colId) {
    if (expandedColl === colId) { setExpandedColl(null); return; }
    setExpandedColl(colId);
    setExpandLoading(true);
    try {
      const res = await api.get(`/collections/${colId}`);
      setExpandedPlaces(res.data.collection.places || []);
    } catch {}
    finally { setExpandLoading(false); }
  }

  async function handleCreate() {
    if (!newCollName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/collections', { name: newCollName.trim() });
      setCollections(prev => [{ ...res.data.collection, place_count: 0 }, ...prev]);
      setNewCollName('');
      setCreateOpen(false);
    } catch {}
    finally { setCreating(false); }
  }

  async function handleDelete(e, colId) {
    e.stopPropagation();
    try {
      await api.delete(`/collections/${colId}`);
      setCollections(prev => prev.filter(c => c.id !== colId));
      if (expandedColl === colId) setExpandedColl(null);
    } catch {}
  }

  if (!user) return <Navigate to="/login" replace />;

  const displayName = user.username || user.email.split('@')[0];

  async function unsave(placeId) {
    setSaved(prev => prev.filter(p => p.place_id !== placeId));
    try { await api.post(`/interactions/favorite/${placeId}`); } catch {}
  }

  return (
    <div className="sv-layout">

      <aside className="sv-sidebar">
        <div className="sv-sidebar-logo">Urban <span>Explorer</span></div>
        <nav className="sv-sidebar-nav">
          <Link to="/discover" className="sv-sidebar-item"><Compass size={18} /><span>Discover</span></Link>
          <Link to="/saved"    className="sv-sidebar-item active"><Bookmark size={18} /><span>Saved</span></Link>
          <Link to="/profile"  className="sv-sidebar-item"><User size={18} /><span>Profile</span></Link>
          <Link to="/settings" className="sv-sidebar-item"><Settings size={18} /><span>Settings</span></Link>
        </nav>
        <div className="sv-sidebar-user">
          <div className="sv-sidebar-avatar">{displayName[0].toUpperCase()}</div>
          <div className="sv-sidebar-user-info">
            <div className="sv-sidebar-user-name">{displayName}</div>
            <div className="sv-sidebar-user-sub">View profile</div>
          </div>
        </div>
      </aside>

      <div className="sv-page">

        <div className="sv-header">
          <div>
            <h1 className="sv-title">Saved</h1>
            <p className="sv-subtitle">All the places you love, in one place.</p>
          </div>
          <div className="sv-header-actions">
            <button className="sv-icon-btn"><Search size={18} /></button>
          </div>
        </div>

        <div className="sv-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`sv-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="sv-loading"><div className="sv-spinner" /></div>
        ) : (
          <div className="sv-body">

            {activeTab === 'saved' && (
              <>
                <div className="sv-section-head">
                  <div className="sv-section-title-row">
                    <Bookmark size={15} color="#22c55e" />
                    <h2 className="sv-section-title">Your saved places</h2>
                  </div>
                  <span className="sv-count">{saved.length} places</span>
                </div>

                {saved.length === 0 ? (
                  <div className="sv-empty">
                    <Bookmark size={40} color="#374151" />
                    <p>No saved places yet.</p>
                    <Link to="/discover" className="sv-empty-link">Start exploring →</Link>
                  </div>
                ) : (
                  <div className="sv-grid">
                    {saved.map(p => (
                      <SavedCard key={p.place_id} place={p}
                        onUnsave={() => unsave(p.place_id)}
                        onClick={() => setSelectedPlaceId(p.place_id)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'visited' && (
              <>
                <div className="sv-section-head">
                  <div className="sv-section-title-row">
                    <Check size={15} color="#22c55e" />
                    <h2 className="sv-section-title">Visited places</h2>
                  </div>
                  <span className="sv-count">{visited.length} places</span>
                </div>

                {visited.length === 0 ? (
                  <div className="sv-empty">
                    <Check size={40} color="#374151" />
                    <p>No visited places yet.</p>
                    <Link to="/discover" className="sv-empty-link">Find somewhere to go →</Link>
                  </div>
                ) : (
                  <div className="sv-grid">
                    {visited.map(p => (
                      <VisitedCard key={p.place_id} place={p}
                        onClick={() => setSelectedPlaceId(p.place_id)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'collections' && (
              <>
                <div className="sv-section-head">
                  <div className="sv-section-title-row">
                    <Folder size={15} color="#22c55e" />
                    <h2 className="sv-section-title">Your collections</h2>
                  </div>
                  <button className="sv-create-btn" onClick={() => setCreateOpen(o => !o)}>
                    <Plus size={14} /> New collection
                  </button>
                </div>

                {createOpen && (
                  <div className="sv-create-form">
                    <input
                      className="sv-create-input"
                      placeholder="Collection name…"
                      value={newCollName}
                      onChange={e => setNewCollName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreate()}
                      autoFocus
                    />
                    <button className="sv-create-submit" onClick={handleCreate} disabled={creating}>
                      {creating ? '…' : 'Create'}
                    </button>
                    <button className="sv-create-cancel" onClick={() => setCreateOpen(false)}>Cancel</button>
                  </div>
                )}

                {collections.length === 0 && !createOpen ? (
                  <div className="sv-empty sv-empty-tall">
                    <Folder size={48} color="#374151" />
                    <p className="sv-empty-title">No collections yet</p>
                    <p className="sv-empty-sub">Group your saved places into collections to plan trips and share with friends.</p>
                  </div>
                ) : (
                  <div className="sv-coll-list">
                    {collections.map(col => (
                      <div key={col.id} className="sv-coll-row">
                        <button className="sv-coll-header" onClick={() => openCollection(col.id)}>
                          <div className="sv-coll-cover">
                            {col.cover_image
                              ? <img src={col.cover_image} alt={col.name} />
                              : <Folder size={20} color="#374151" />
                            }
                          </div>
                          <div className="sv-coll-info">
                            <span className="sv-coll-name">{col.name}</span>
                            <span className="sv-coll-count">{col.place_count} {col.place_count === 1 ? 'place' : 'places'}</span>
                          </div>
                          <div className="sv-coll-actions">
                            <button className="sv-coll-delete" onClick={e => handleDelete(e, col.id)}>
                              <Trash2 size={14} />
                            </button>
                            {expandedColl === col.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        {expandedColl === col.id && (
                          <div className="sv-coll-places">
                            {expandLoading ? (
                              <div className="sv-loading"><div className="sv-spinner" /></div>
                            ) : expandedPlaces.length === 0 ? (
                              <p className="sv-coll-empty-msg">No places in this collection yet.</p>
                            ) : (
                              <div className="sv-grid">
                                {expandedPlaces.map(p => (
                                  <SavedCard key={p.place_id} place={p}
                                    onUnsave={() => {}}
                                    onClick={() => setSelectedPlaceId(p.place_id)} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab !== 'collections' && (
              <div className="sv-cta" style={{ backgroundImage: `url(${campfireImg})` }}>
                <div className="sv-cta-overlay" />
                <div className="sv-cta-content">
                  <h3 className="sv-cta-title">Turn saved places into plans</h3>
                  <p className="sv-cta-sub">Create lists, build itineraries and share with friends.</p>
                  <button className="sv-cta-btn" onClick={() => setActiveTab('collections')}>
                    Create a collection
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {selectedPlaceId && (
        <div className="sv-modal-backdrop" onClick={() => setSelectedPlaceId(null)}>
          <div className="sv-modal" onClick={e => e.stopPropagation()}>
            <PlaceDetail modalId={selectedPlaceId} onClose={() => setSelectedPlaceId(null)} />
          </div>
        </div>
      )}

    </div>
  );
}

function SavedCard({ place, onUnsave, onClick }) {
  const badge  = getBadge(place);
  const rating = parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0;

  return (
    <div className="sv-card" onClick={onClick}>
      {place.image_url && <img src={place.image_url} alt={place.name} className="sv-card-img" />}
      <div className="sv-card-overlay" />
      {badge && <span className="sv-card-badge">{badge}</span>}
      <button className="sv-card-bookmark" onClick={e => { e.stopPropagation(); onUnsave(); }}>
        <Bookmark size={14} fill="currentColor" />
      </button>
      <div className="sv-card-bottom">
        <div className="sv-card-name">{place.name}</div>
        {place.subcategory && <div className="sv-card-sub">{place.subcategory.replace(/_/g, ' ')}</div>}
        <div className="sv-card-meta">
          <span className="sv-card-loc"><MapPin size={10} />{place.city}</span>
          <span className="sv-card-rating"><Star size={10} fill="currentColor" />{rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

function VisitedCard({ place, onClick }) {
  const rating = parseFloat(place.average_rating) || parseFloat(place.google_rating) || 0;

  return (
    <div className="sv-card" onClick={onClick}>
      {place.image_url && <img src={place.image_url} alt={place.name} className="sv-card-img" />}
      <div className="sv-card-overlay sv-card-overlay-dark" />
      <div className="sv-card-bottom">
        <div className="sv-card-name">{place.name}</div>
        {place.subcategory && <div className="sv-card-sub">{place.subcategory.replace(/_/g, ' ')}</div>}
        <div className="sv-card-meta">
          <span className="sv-card-loc"><MapPin size={10} />{place.city}</span>
          <span className="sv-card-rating"><Star size={10} fill="currentColor" />{rating.toFixed(1)}</span>
        </div>
        <div className="sv-card-visited-label">Visited on {formatDate(place.created_at)}</div>
      </div>
    </div>
  );
}
