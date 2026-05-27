// Combined discovery feed — AI-powered sections, mood filters, and place browser in one page

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Search, MapPin, Heart, Star, SlidersHorizontal, X, LogOut, User, ChevronDown, Compass, Bookmark, Settings, Sparkles, Gamepad2, Mountain, Zap, Gift, Trophy, ChevronLeft, ChevronRight, Leaf, Palette, Users } from 'lucide-react';
import campfireImg from '../assets/images/campfire.png';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PlaceDetail from './PlaceDetail';
import BottomNav from '../components/BottomNav';
import './Discover.css';

const VIBES = [
  {
    label: 'Adrenaline', sub: 'Get your heart racing', Icon: Zap, color: '#f59e0b',
    tags: ['high energy', 'axe throwing', 'paintball', 'obstacle course', 'go karting', 'racing', 'archery', 'climbing', 'ziplining', 'ninja warrior', 'rage room', 'smash room', 'trampoline', 'coasteering'],
  },
  {
    label: 'Chill', sub: 'Relax & unwind', Icon: Leaf, color: '#290fa1',
    tags: ['chill', 'board games', 'cinema', 'comedy', 'float tank', 'sound bath', 'yoga', 'pottery', 'art jamming', 'wellness', 'spa', 'sauna'],
  },
  {
    label: 'Creative', sub: 'Make something', Icon: Palette, color: '#ec4899',
    tags: ['pottery', 'craft experience', 'paint & sip', 'art jamming', 'cocktail masterclass', 'cooking class', 'chocolate making'],
  },
  {
    label: 'Fun with friends', sub: 'Get the whole crew together', Icon: Users, color: '#60a5fa',
    tags: ['group activity', 'laser tag', 'bowling', 'karaoke', 'paintball', 'escape room', 'trampoline', 'axe throwing', 'go karting', 'racing', 'archery', 'VR gaming', 'arcade'],
  },
  {
    label: 'Outdoor', sub: 'Get in nature', Icon: Mountain, color: '#22c55e',
    tags: ['hiking', 'kayaking', 'cycling', 'coastal walk', 'paddleboarding', 'wild swimming', 'outdoor', 'scenic routes', 'surfing', 'horse riding', 'water sports', 'cold plunge'],
  },
  {
    label: 'Unique', sub: 'One of a kind', Icon: Sparkles, color: '#a855f7',
    tags: ['immersive', 'immersive theatre', 'float tank', 'sensory deprivation', 'speakeasy', 'hidden venue', 'photo booth', 'interactive museum', 'sound bath', 'rage room', 'story-based'],
  },
];

const COLLECTIONS = [
  {
    label: 'Rainy Day Activities', sub: 'Best ways to beat the rain indoors', ideas: 12,
    bg: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&q=80',
    tags: ['escape room', 'VR gaming', 'bowling', 'laser tag', 'arcade', 'retro arcade', 'karaoke', 'board games', 'cinema', 'immersive', 'pottery', 'paint & sip', 'comedy', 'darts', 'trampoline', 'table tennis', 'pool billiards', 'mini golf', 'climbing'],
  },
  {
    label: 'Date Night Ideas', sub: 'Romantic experiences for two', ideas: 8,
    bg: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    tags: ['date night', 'pottery', 'paint & sip', 'cocktail masterclass', 'cooking class', 'escape room', 'axe throwing', 'bowling', 'cinema', 'comedy', 'archery', 'padel', 'kayaking', 'chocolate making'],
  },
  {
    label: 'Free Things to Do', sub: 'Great experiences that cost nothing', ideas: 15,
    bg: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
    tags: ['hiking', 'coastal walk', 'scenic routes', 'outdoor', 'wild swimming', 'cycling', 'park', 'picnic spot', 'nature', 'green space', 'group hangout'],
  },
  {
    label: 'Group Activities', sub: 'Get the whole crew together', ideas: 10,
    bg: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    tags: ['group activity', 'laser tag', 'bowling', 'karaoke', 'paintball', 'escape room', 'trampoline', 'axe throwing', 'go karting', 'archery', 'VR gaming', 'arcade', 'racing'],
  },
  {
    label: 'Birthday Ideas', sub: 'Make it a day to remember', ideas: 9,
    bg: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80',
    tags: ['birthday activity', 'trampoline', 'laser tag', 'bowling', 'go karting', 'karaoke', 'axe throwing', 'escape room', 'VR gaming', 'paintball', 'archery', 'rage room', 'comedy'],
  },
  {
    label: 'Adrenaline Rush', sub: 'For those who live on the edge', ideas: 7,
    bg: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80',
    tags: ['high energy', 'axe throwing', 'paintball', 'obstacle course', 'go karting', 'racing', 'archery', 'climbing', 'ziplining', 'ninja warrior', 'rage room', 'smash room', 'trampoline', 'coasteering'],
  },
  {
    label: 'Competitive Fun', sub: 'May the best person win', ideas: 8,
    bg: 'https://images.unsplash.com/photo-1545809074-59472b3f5ecc?w=800&q=80',
    tags: ['padel', 'tennis', 'football', 'soccer', 'badminton', 'archery', 'axe throwing', 'darts', 'laser tag', 'paintball', 'table tennis', 'bowling', 'golf', 'driving range', 'bouldering', 'basketball', 'pool billiards'],
  },
  {
    label: 'Creative Experiences', sub: 'Make something with your hands', ideas: 6,
    bg: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
    tags: ['pottery', 'craft experience', 'paint & sip', 'art jamming', 'cocktail masterclass', 'cooking class', 'chocolate making'],
  },
  {
    label: 'Open Late', sub: 'Still going after dark', ideas: 10,
    bg: 'https://images.unsplash.com/photo-1514565131-fce0801e6785?w=800&q=80',
    filter: 'open_late',
  },
  {
    label: 'Sunset Spots', sub: 'Golden hour views worth chasing', ideas: 6,
    bg: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    tags: ['scenic routes', 'coastal walk', 'hiking', 'outdoor', 'nature', 'wild swimming', 'surfing', 'horse riding', 'park', 'picnic spot'],
  },
  {
    label: 'Hidden Gems', sub: 'Highly rated · Rarely crowded', ideas: 11,
    bg: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    tags: ['speakeasy', 'hidden venue', 'float tank', 'sound bath', 'wild swimming', 'coasteering', 'pottery', 'art jamming', 'chocolate making', 'immersive theatre', 'archery'],
  },
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


const FAMILY_TAGS = [
  'bowling', 'laser tag', 'arcade', 'mini golf', 'VR gaming',
  'skating', 'ice skating', 'trampoline', 'escape room',
  'aquarium', 'family friendly', 'inflatable park',
  'ninja warrior', 'go karting', 'obstacle course',
];


// Filter functions for collections that can't be expressed with tags alone
const SPECIAL_FILTERS = {
  open_late: p => {
    if (!Array.isArray(p.hours)) return false;
    return p.hours.some(desc => {
      const closeTime = desc.split('–')[1] || '';
      return /\b(10|11):00 PM|\b12:00 AM|\b[12]:00 AM|Open 24/i.test(closeTime);
    });
  },
};
const PAGE_SIZE = 24;

const FILTER_CATEGORIES = [
  { label: 'Adventure',        value: 'adventure'         },
  { label: 'Indoor',           value: 'indoor_activity'   },
  { label: 'Outdoor',          value: 'outdoor_activity'  },
  { label: 'Unique',           value: 'unique_experience' },
  { label: 'Sports & Fitness', value: 'sports_fitness'    },
];

const PRICE_LABELS = { 1: 'Free', 2: 'Affordable', 3: 'Mid-range', 4: 'Premium' };

const OCCASION_TAGS = [
  'group activity', 'date night', 'birthday activity',
  'high energy', 'solo adventure', 'skill-based', 'chill', 'wellness',
];

const CATEGORY_TAGS = {
  indoor_activity: [
    'escape room', 'puzzle', 'laser tag', 'VR gaming', 'immersive',
    'board games', 'karaoke', 'comedy', 'live entertainment',
    'arcade', 'retro arcade', 'cinema', 'darts', 'social gaming',
    'pool billiards', 'mini golf', 'table tennis', 'ping pong',
    'bowling', 'skating', 'ice skating', 'roller skating',
    'racing simulator', 'sim racing',
  ],
  outdoor_activity: [
    'hiking', 'scenic routes', 'nature', 'kayaking', 'water sports',
    'cycling', 'active', 'coastal walk', 'paddleboarding',
    'wild swimming', 'cold plunge', 'outdoor', 'park',
    'picnic spot', 'group hangout', 'green space', 'surfing', 'horse riding',
  ],
  unique_experience: [
    'axe throwing', 'trampoline', 'rage room', 'smash room',
    'immersive theatre', 'story-based', 'pottery', 'craft experience',
    'paint & sip', 'art jamming', 'cocktail masterclass', 'cooking class',
    'float tank', 'sensory deprivation', 'photo booth',
    'interactive museum', 'spa', 'chocolate making', 'sauna',
    'cold plunge', 'aquarium', 'nature', 'family friendly',
  ],
  adventure: [
    'paintball', 'obstacle course', 'ninja warrior', 'inflatable park',
    'archery', 'shooting range', 'climbing', 'coasteering',
    'go karting', 'racing', 'ziplining', 'outdoor',
  ],
  sports_fitness: [
    'padel', 'tennis', 'football', 'soccer', 'badminton',
    'basketball', 'golf', 'driving range', 'bouldering', 'climbing',
    'swimming', 'active', 'yoga', 'wellness',
  ],
};


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
  const [activeVibeFilter, setActiveVibeFilter] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterOpen, setFilterOpen]     = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [cityDropOpen, setCityDropOpen] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [seedPlace, setSeedPlace]             = useState(null);

  // Filter draft state — what the user is editing inside the modal
  const [draftCategories, setDraftCategories] = useState([]);
  const [draftPriceLevels, setDraftPriceLevels] = useState([]);
  const [draftMinRating, setDraftMinRating]   = useState(null);
  const [draftTags, setDraftTags]             = useState([]);

  // Applied filter state — null means no server filter active
  const [appliedFilters, setAppliedFilters]       = useState(null);

  // Server-fetched filter results
  const [filterResults, setFilterResults]         = useState([]);
  const [filterTotal, setFilterTotal]             = useState(0);
  const [filterOffset, setFilterOffset]           = useState(0);
  const [filterLoading, setFilterLoading]         = useState(false);
  const [filterLoadingMore, setFilterLoadingMore] = useState(false);

  const [familyPlaces,        setFamilyPlaces]        = useState([]);
  const [friendsPlaces,       setFriendsPlaces]       = useState([]);
  const [similarPlaces,       setSimilarPlaces]       = useState([]);
  const [becauseSectionPlaces, setBecauseSectionPlaces] = useState([]);

  // Server-fetched category browse (circle chips)
  const [browseCategory, setBrowseCategory] = useState(null);
  const [browsePage,     setBrowsePage]     = useState(0);
  const [browseResults,  setBrowseResults]  = useState([]);
  const [browseTotal,    setBrowseTotal]    = useState(0);
  const [browseLoading,  setBrowseLoading]  = useState(false);

  const forYouRef   = useRef(null);
  const trendingRef = useRef(null);
  const familyRef       = useRef(null);
  const friendsRef      = useRef(null);
  const collectionsRef  = useRef(null);
  const mightLikeRef    = useRef(null);
  const becauseRef      = useRef(null);
  const loveCatRef      = useRef(null);
  const similarRef      = useRef(null);
  const searchDebounceRef  = useRef(null);
  const appliedFiltersRef  = useRef(null);

  function scroll(ref, dir) {
    if (ref.current) ref.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
  }

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/recommendations/profile');
      setProfile(res.data.profile);
    } catch {}
  }, []);

  const fetchData = useCallback(async (city) => {
    setLoading(true);
    try {
      const q = city ? `city=${encodeURIComponent(city)}&` : '';
      const [recsRes, placesRes] = await Promise.all([
        api.get(`/recommendations?${q}limit=100`),
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
    fetchProfile();
  }, [fetchProfile]);

  const fetchSectionPlaces = useCallback(async (tags, setter, city) => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    params.set('tags',   tags.join(','));
    params.set('limit',  50);
    params.set('random', 'true');
    try {
      const res = await api.get(`/places?${params}`);
      setter(res.data.places || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;

    api.get('/places/stats')
      .then(res => setCities([...new Set((res.data.stats || []).map(s => s.city))].sort()))
      .catch(() => {});

    api.get('/interactions/my/favorites')
      .then(res => {
        const favs = res.data.places || [];
        setFavorites(new Set(favs.map(p => p.place_id)));
        if (favs[0]) setSeedPlace(favs[0]);
      })
      .catch(() => {});

    fetchProfile();

    fetchData('Dublin');
    fetchSectionPlaces(FAMILY_TAGS,        setFamilyPlaces,  'Dublin');
    fetchSectionPlaces(['group activity'], setFriendsPlaces, 'Dublin');
    api.get('/recommendations/similar?city=Dublin')
      .then(res => setSimilarPlaces(res.data.places || []))
      .catch(() => {});
  }, [fetchData, fetchSectionPlaces, fetchProfile, user]);

  // Re-fetch "Because you liked" whenever the seed place or city changes
  useEffect(() => {
    if (!seedPlace?.subcategory) { setBecauseSectionPlaces([]); return; }
    const params = new URLSearchParams();
    if (selectedCity) params.set('city', selectedCity);
    params.set('subcategory', seedPlace.subcategory);
    params.set('limit', 50);
    api.get(`/places?${params}`)
      .then(res => setBecauseSectionPlaces(res.data.places || []))
      .catch(() => {});
  }, [seedPlace, selectedCity]);

  const activeFilterCount = useMemo(() => {
    if (!appliedFilters) return 0;
    return (
      appliedFilters.categories.length +
      appliedFilters.priceLevels.length +
      (appliedFilters.minRating ? 1 : 0) +
      appliedFilters.tags.length +
      (appliedFilters.search ? 1 : 0)
    );
  }, [appliedFilters]);

  const fetchFilterResults = useCallback(async (filters, offset = 0) => {
    const isMore = offset > 0;
    isMore ? setFilterLoadingMore(true) : setFilterLoading(true);
    const params = new URLSearchParams();
    if (selectedCity) params.set('city', selectedCity);
    params.set('limit', 20);
    params.set('offset', offset);
    if (filters.categories.length)  params.set('categories',   filters.categories.join(','));
    if (filters.priceLevels.length) params.set('price_levels', filters.priceLevels.join(','));
    if (filters.minRating)          params.set('min_rating',   filters.minRating);
    if (filters.tags.length)        params.set('tags',         filters.tags.join(','));
    if (filters.search)             params.set('search',       filters.search);
    try {
      const res = await api.get(`/places?${params}`);
      const { places, total } = res.data;
      if (isMore) {
        setFilterResults(prev => [...prev, ...places]);
      } else {
        setFilterResults(places);
      }
      setFilterTotal(total);
      setFilterOffset(offset + places.length);
    } catch {}
    finally {
      setFilterLoading(false);
      setFilterLoadingMore(false);
    }
  }, [selectedCity]);

  const fetchBrowseCategory = useCallback(async (category, page, city) => {
    setBrowseLoading(true);
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    params.set('categories', category);
    params.set('limit', PAGE_SIZE);
    params.set('offset', page * PAGE_SIZE);
    params.set('random', 'true');
    try {
      const res = await api.get(`/places?${params}`);
      setBrowseResults(res.data.places || []);
      setBrowseTotal(res.data.total || 0);
      setBrowsePage(page);
    } catch {}
    finally { setBrowseLoading(false); }
  }, []);

  // Keep a ref to the latest appliedFilters so the debounce callback reads it without a stale closure
  useEffect(() => { appliedFiltersRef.current = appliedFilters; }, [appliedFilters]);

  // Fires a server query 400ms after the user stops typing
  useEffect(() => {
    if (!user) return;
    clearTimeout(searchDebounceRef.current);

    if (searchQuery.length < 2) {
      const current = appliedFiltersRef.current;
      if (current?.search) {
        const next = { ...current, search: '' };
        const isEmpty = !next.categories.length && !next.priceLevels.length && !next.minRating && !next.tags.length;
        if (isEmpty) {
          setAppliedFilters(null);
          setFilterResults([]); setFilterTotal(0); setFilterOffset(0);
        } else {
          setAppliedFilters(next);
          fetchFilterResults(next, 0);
        }
      }
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      const current = appliedFiltersRef.current;
      const filters = current
        ? { ...current, search: searchQuery }
        : { categories: [], priceLevels: [], minRating: null, tags: [], search: searchQuery };
      setAppliedFilters(filters);
      fetchFilterResults(filters, 0);
    }, 400);
  }, [searchQuery, user, fetchFilterResults]);

  if (!user) return <Navigate to="/login" replace />;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function openFilterModal() {
    if (appliedFilters) {
      setDraftCategories(appliedFilters.categories);
      setDraftPriceLevels(appliedFilters.priceLevels);
      setDraftMinRating(appliedFilters.minRating);
      setDraftTags(appliedFilters.tags);
    }
    setFilterOpen(true);
  }

  function handleApplyFilters() {
    const filters = {
      categories:  draftCategories,
      priceLevels: draftPriceLevels,
      minRating:   draftMinRating,
      tags:        draftTags,
      search:      searchQuery,
    };
    setAppliedFilters(filters);
    fetchFilterResults(filters, 0);
    setFilterOpen(false);
  }

  function handleClearFilters() {
    setAppliedFilters(null);
    setFilterResults([]);
    setFilterTotal(0);
    setFilterOffset(0);
    setDraftCategories([]);
    setDraftPriceLevels([]);
    setDraftMinRating(null);
    setDraftTags([]);
    setSearchQuery('');
    setActiveMood(null);
    setActiveVibeFilter(null);
  }

  function handleCategoryClick(value) {
    if (value === null) {
      setBrowseCategory(null);
      setBrowseResults([]);
      setBrowseTotal(0);
      setBrowsePage(0);
      setActiveVibeFilter(null);
      setActiveMood(null);
    } else {
      setBrowseCategory(value);
      setActiveMood(null);
      fetchBrowseCategory(value, 0, selectedCity);
    }
  }

  function handleCityChange(city) {
    setSelectedCity(city);
    setCityDropOpen(false);
    fetchData(city);
    if (appliedFilters) fetchFilterResults(appliedFilters, 0);
    if (browseCategory) fetchBrowseCategory(browseCategory, 0, city);
    fetchSectionPlaces(FAMILY_TAGS,        setFamilyPlaces,  city);
    fetchSectionPlaces(['group activity'], setFriendsPlaces, city);
    api.get(`/recommendations/similar${city ? `?city=${encodeURIComponent(city)}` : ''}`)
      .then(res => setSimilarPlaces(res.data.places || []))
      .catch(() => {});
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
      activeMood === 'trending'        ? [...places].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0)) :
      activeMood                       ? places.filter(p => p.category === activeMood) :
      activeVibeFilter === 'for_you'   ? recs :
      activeVibeFilter === 'trending_now' ? [...places].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0)) :
      activeVibeFilter            ? (
        Array.isArray(activeVibeFilter)
          ? places.filter(p => p.tags?.some(t => activeVibeFilter.includes(t)))
          : places.filter(SPECIAL_FILTERS[activeVibeFilter] || (() => false))
      ) :
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

  // "Because you liked [place]" — server-fetched by subcategory, sorted by tag overlap
  const showBecause   = seedPlace !== null;
  const becausePlaces = showBecause
    ? becauseSectionPlaces
        .filter(p => p.id !== seedPlace.place_id)
        .sort((a, b) => {
          const overlapA = a.tags?.filter(t => seedPlace.tags?.includes(t)).length || 0;
          const overlapB = b.tags?.filter(t => seedPlace.tags?.includes(t)).length || 0;
          return overlapB - overlapA;
        })
        .slice(0, 25)
    : [];

  const sortedCats   = Object.entries(profile?.categoryAffinities || {}).sort((a, b) => b[1] - a[1]);
  const topCat       = sortedCats[0]?.[0] || null;
  const loveCatPlaces = (profile?.interactionCount >= 5 && topCat)
    ? places.filter(p => p.category === topCat).slice(0, 25)
    : [];

  const forYouRecs       = recs.slice(0, 50);
  const mightLikeRecs    = recs.slice(50, 100);
  const trending         = [...places].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0)).slice(0, 25);

  const isServerFiltering  = appliedFilters !== null;
  const isBrowsingCategory = !isServerFiltering && browseCategory !== null;
  const isLocalFiltering   = !isServerFiltering && !isBrowsingCategory && (activeMood !== null || activeVibeFilter !== null || searchQuery);
  const feedPlaces   = getFilteredFeed();
  const recScores    = activeVibeFilter === 'for_you' ? Object.fromEntries(recs.map(r => [r.id, r.score])) : null;
  const totalBrowsePages = Math.ceil(browseTotal / PAGE_SIZE);
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
              placeholder="Search places, activities, tags…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="disc-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
            <button className="disc-search-filter" onClick={e => { e.stopPropagation(); openFilterModal(); }}>
              <SlidersHorizontal size={14} />
              {activeFilterCount > 0 && <span className="disc-filter-badge">{activeFilterCount}</span>}
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
          <div className="disc-modal disc-modal--scroll" onClick={e => e.stopPropagation()}>

            <div className="disc-modal-header">
              <h3>
                Filters
                {activeFilterCount > 0 && <span className="disc-modal-badge">{activeFilterCount}</span>}
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {activeFilterCount > 0 && (
                  <button className="disc-modal-clear" onClick={handleClearFilters}>Clear all</button>
                )}
                <button onClick={() => setFilterOpen(false)}><X size={18} /></button>
              </div>
            </div>

            <p className="disc-modal-label">Category</p>
            <div className="disc-modal-prices">
              {FILTER_CATEGORIES.map(({ label, value }) => (
                <button
                  key={value}
                  className={`disc-modal-price-btn${draftCategories.includes(value) ? ' active' : ''}`}
                  onClick={() => {
                    setDraftCategories(prev => {
                      const next = prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value];
                      // Remove category-specific tags that no longer belong; keep occasion tags
                      const validTags = new Set([...next.flatMap(c => CATEGORY_TAGS[c] || []), ...OCCASION_TAGS]);
                      setDraftTags(t => t.filter(tag => validTags.has(tag)));
                      return next;
                    });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="disc-modal-label">Occasion</p>
            <div className="disc-modal-tags" style={{ marginBottom: 24 }}>
              {OCCASION_TAGS.map(tag => (
                <button
                  key={tag}
                  className={`disc-modal-tag-btn${draftTags.includes(tag) ? ' active' : ''}`}
                  onClick={() => setDraftTags(prev =>
                    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            <p className="disc-modal-label">Price Level</p>
            <div className="disc-modal-prices">
              {[1, 2, 3, 4].map(l => (
                <button
                  key={l}
                  className={`disc-modal-price-btn${draftPriceLevels.includes(l) ? ' active' : ''}`}
                  onClick={() => setDraftPriceLevels(prev =>
                    prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]
                  )}
                >
                  {PRICE_LABELS[l]}
                </button>
              ))}
            </div>

            <p className="disc-modal-label">Tags</p>
            {draftCategories.length === 0 ? (
              <p className="disc-modal-tags-hint">Select a category above to see relevant tags</p>
            ) : (
              <div className="disc-modal-tags">
                {[...new Set(draftCategories.flatMap(c => CATEGORY_TAGS[c] || []))]
                  .filter(tag => !OCCASION_TAGS.includes(tag))
                  .map(tag => (
                    <button
                      key={tag}
                      className={`disc-modal-tag-btn${draftTags.includes(tag) ? ' active' : ''}`}
                      onClick={() => setDraftTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            )}

            <button className="disc-modal-apply" onClick={handleApplyFilters}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      <div className="disc-body">

        <div className="disc-cat-circles">
          {CATEGORIES.map(({ label, value, Icon, color }) => {
            const isActive = value === null ? (!isServerFiltering && browseCategory === null && !isLocalFiltering) : browseCategory === value;
            return (
              <button
                key={label}
                className={`disc-cat-circle-btn${isActive ? ' active' : ''}`}
                onClick={() => handleCategoryClick(value)}
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
        ) : isServerFiltering ? (
          <>
              <div className="disc-filter-chips">
              {appliedFilters.categories.map(c => (
                <span key={c} className="disc-filter-chip">
                  {FILTER_CATEGORIES.find(f => f.value === c)?.label || c}
                  <button onClick={() => {
                    const next = { ...appliedFilters, categories: appliedFilters.categories.filter(x => x !== c) };
                    const isEmpty = next.categories.length === 0 && next.priceLevels.length === 0 && !next.minRating && next.tags.length === 0 && !next.search;
                    if (isEmpty) { handleClearFilters(); } else { setAppliedFilters(next); fetchFilterResults(next, 0); }
                  }}><X size={10} /></button>
                </span>
              ))}
              {appliedFilters.priceLevels.map(l => (
                <span key={l} className="disc-filter-chip">
                  {PRICE_LABELS[l]}
                  <button onClick={() => {
                    const next = { ...appliedFilters, priceLevels: appliedFilters.priceLevels.filter(x => x !== l) };
                    const isEmpty = next.categories.length === 0 && next.priceLevels.length === 0 && !next.minRating && next.tags.length === 0 && !next.search;
                    if (isEmpty) { handleClearFilters(); } else { setAppliedFilters(next); fetchFilterResults(next, 0); }
                  }}><X size={10} /></button>
                </span>
              ))}
              {appliedFilters.minRating && (
                <span className="disc-filter-chip">
                  {appliedFilters.minRating}+ stars
                  <button onClick={() => {
                    const next = { ...appliedFilters, minRating: null };
                    const isEmpty = next.categories.length === 0 && next.priceLevels.length === 0 && !next.minRating && next.tags.length === 0 && !next.search;
                    if (isEmpty) { handleClearFilters(); } else { setAppliedFilters(next); fetchFilterResults(next, 0); }
                  }}><X size={10} /></button>
                </span>
              )}
              {appliedFilters.tags.map(t => (
                <span key={t} className="disc-filter-chip">
                  {t}
                  <button onClick={() => {
                    const next = { ...appliedFilters, tags: appliedFilters.tags.filter(x => x !== t) };
                    const isEmpty = next.categories.length === 0 && next.priceLevels.length === 0 && !next.minRating && next.tags.length === 0 && !next.search;
                    if (isEmpty) { handleClearFilters(); } else { setAppliedFilters(next); fetchFilterResults(next, 0); }
                  }}><X size={10} /></button>
                </span>
              ))}
              {appliedFilters.search && (
                <span className="disc-filter-chip">
                  "{appliedFilters.search}"
                  <button onClick={() => {
                    const next = { ...appliedFilters, search: '' };
                    setSearchQuery('');
                    const isEmpty = next.categories.length === 0 && next.priceLevels.length === 0 && !next.minRating && next.tags.length === 0 && !next.search;
                    if (isEmpty) { handleClearFilters(); } else { setAppliedFilters(next); fetchFilterResults(next, 0); }
                  }}><X size={10} /></button>
                </span>
              )}
              <button className="disc-filter-chip disc-filter-chip--clear" onClick={handleClearFilters}>
                Clear all
              </button>
            </div>

            <p className="disc-results-count">
              {filterTotal} {filterTotal === 1 ? 'place' : 'places'} found
            </p>

            {filterLoading ? (
              <div className="disc-skel-grid">{[1,2,3,4].map(n => <div key={n} className="disc-skel-card" />)}</div>
            ) : filterResults.length === 0 ? (
              <div className="disc-empty">
                <p>Nothing matches these filters.</p>
                <button className="disc-empty-btn" onClick={handleClearFilters}>Clear filters</button>
              </div>
            ) : (
              <>
                <div className="disc-feed-grid">
                  {filterResults.map(place => (
                    <FeedCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
                {filterOffset < filterTotal && (
                  <div className="disc-load-more-wrap">
                    <button
                      className="disc-load-more-btn"
                      disabled={filterLoadingMore}
                      onClick={() => fetchFilterResults(appliedFilters, filterOffset)}
                    >
                      {filterLoadingMore ? 'Loading…' : `Load more (${filterTotal - filterOffset} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : isBrowsingCategory ? (
          <>
            <div className="disc-browse-header">
              <h2 className="disc-browse-title">
                {CATEGORIES.find(c => c.value === browseCategory)?.label || browseCategory}
              </h2>
              {!browseLoading && <span className="disc-browse-count">{browseTotal} places</span>}
            </div>

            {browseLoading ? (
              <div className="disc-skel-grid">{[1,2,3,4,5,6].map(n => <div key={n} className="disc-skel-card" />)}</div>
            ) : browseResults.length === 0 ? (
              <div className="disc-empty">
                <p>No places found in this category.</p>
                <button className="disc-empty-btn" onClick={() => handleCategoryClick(null)}>Back to feed</button>
              </div>
            ) : (
              <>
                <div className="disc-feed-grid">
                  {browseResults.map(place => (
                    <FeedCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
                {totalBrowsePages > 1 && (
                  <div className="disc-pagination">
                    <button
                      className="disc-pagination-btn"
                      disabled={browsePage === 0}
                      onClick={() => { fetchBrowseCategory(browseCategory, browsePage - 1, selectedCity); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                      ← Previous
                    </button>
                    <span className="disc-pagination-info">Page {browsePage + 1} of {totalBrowsePages}</span>
                    <button
                      className="disc-pagination-btn"
                      disabled={browsePage + 1 >= totalBrowsePages}
                      onClick={() => { fetchBrowseCategory(browseCategory, browsePage + 1, selectedCity); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : isLocalFiltering ? (
          <>
            <p className="disc-results-count">{feedPlaces.length} places found</p>
            {feedPlaces.length === 0 ? (
              <div className="disc-empty">
                <p>Nothing matches this filter.</p>
                <button className="disc-empty-btn" onClick={() => { setActiveMood(null); setActiveVibeFilter(null); setSearchQuery(''); }}>Clear filters</button>
              </div>
            ) : (
              <div className="disc-feed-grid">
                {feedPlaces.map(place => (
                  <FeedCard key={place.id} place={place} matchScore={recScores?.[place.id]} favorited={favorites.has(place.id)}
                    onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {forYouRecs.length > 0 && (
              <section className="disc-section disc-section--ai">
                <div className="disc-section-action-head">
                  <div>
                    <div className="disc-ai-header-row">
                      <h2 className="disc-section-title">✨ Personalised for you</h2>
                      <span className="disc-ai-badge">AI</span>
                    </div>
                    <p className="disc-section-sub">Your top picks, ranked by neural matching</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(forYouRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(forYouRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={forYouRef}>
                  {forYouRecs.map((place, i) => (
                    <PersonalizedCard key={place.id} place={place} index={i} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
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
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
              </section>
            )}

            {familyPlaces.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">Family Fun Time</h2>
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
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
              </section>
            )}

            <section className="disc-section">
              <div className="disc-section-head">
                <h2 className="disc-section-title">Explore by vibe</h2>
                <p className="disc-section-sub">Find something that matches your mood</p>
              </div>
              <div className="disc-vibes-grid">
                {VIBES.map(({ label, sub, Icon, color, tags }) => (
                  <button key={label} className="disc-vibe-pill" onClick={() => { setBrowseCategory(null); setActiveMood(null); setActiveVibeFilter(tags); }}>
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


            {showBecause && becausePlaces.length > 0 && (
              <section className="disc-section" style={{ borderLeft: `3px solid ${CAT_COLORS[seedPlace.category] || '#22c55e'}`, paddingLeft: 16 }}>
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">Because you liked {seedPlace.name}</h2>
                    <p className="disc-section-sub" style={{ color: CAT_COLORS[seedPlace.category] || '#22c55e' }}>More like your recent favourite</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(becauseRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(becauseRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={becauseRef}>
                  {becausePlaces.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
              </section>
            )}




            {friendsPlaces.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">Perfect for Friends</h2>
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
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
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
                {COLLECTIONS.map(({ label, sub, ideas, tags, filter, bg }) => (
                  <button key={label} className="disc-collection-card" onClick={() => { setBrowseCategory(null); setActiveMood(null); setActiveVibeFilter(filter || tags); }}
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
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">You Might Like These</h2>
                    <p className="disc-section-sub">More places the model thinks you'd enjoy</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(mightLikeRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(mightLikeRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={mightLikeRef}>
                  {mightLikeRecs.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
              </section>
            )}

            {profile && profile.interactionCount >= 5 && (
              <section className="disc-section disc-taste-card">
                <div className="disc-taste-header">
                  <div>
                    <h2 className="disc-section-title">Your Taste Profile</h2>
                    <p className="disc-section-sub">{profile.interactionCount} interactions · AI mode active</p>
                  </div>
                  <span className="disc-ai-badge">AI</span>
                </div>
                <div className="disc-taste-bars">
                  {Object.entries(profile.categoryAffinities || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([cat, score]) => (
                      <div key={cat} className="disc-taste-bar-row">
                        <span className="disc-taste-bar-label">{CAT_PLURAL[cat] || cat}</span>
                        <div className="disc-taste-bar-track">
                          <div className="disc-taste-bar-fill" style={{ width: `${Math.round(score * 100)}%`, background: CAT_COLORS[cat] || '#22c55e' }} />
                        </div>
                        <span className="disc-taste-bar-pct">{Math.round(score * 100)}%</span>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {similarPlaces.length > 0 && (
              <section className="disc-section">
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">People like you also enjoyed</h2>
                    <p className="disc-section-sub">Places popular with users who share your taste</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(similarRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(similarRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={similarRef}>
                  {similarPlaces.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
              </section>
            )}

            {profile?.interactionCount >= 5 && topCat && loveCatPlaces.length > 0 && (
              <section className="disc-section" style={{ borderLeft: `3px solid ${CAT_COLORS[topCat] || '#22c55e'}`, paddingLeft: 16 }}>
                <div className="disc-section-action-head">
                  <div>
                    <h2 className="disc-section-title">Because you love {CAT_PLURAL[topCat] || topCat}</h2>
                    <p className="disc-section-sub" style={{ color: CAT_COLORS[topCat] || '#22c55e' }}>Your most explored category</p>
                  </div>
                  <div className="disc-scroll-arrows">
                    <button className="disc-arrow-btn" onClick={() => scroll(loveCatRef, -1)}><ChevronLeft size={16} /></button>
                    <button className="disc-arrow-btn" onClick={() => scroll(loveCatRef, 1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="disc-hscroll" ref={loveCatRef}>
                  {loveCatPlaces.map(place => (
                    <SmallCard key={place.id} place={place} favorited={favorites.has(place.id)}
                      onHeart={e => toggleHeart(e, place.id)} onClick={() => setSelectedPlaceId(place.id)} />
                  ))}
                </div>
              </section>
            )}



          </>
        )}

      </div>


    </div>

    {selectedPlaceId && (
      <div className="disc-place-modal-backdrop" onClick={() => { setSelectedPlaceId(null); fetchProfile(); }}>
        <div className="disc-place-modal" onClick={e => e.stopPropagation()}>
          <PlaceDetail modalId={selectedPlaceId} onClose={() => { setSelectedPlaceId(null); fetchProfile(); }} />
        </div>
      </div>
    )}

    <BottomNav />

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
      {place.image_url && <img src={place.image_url} alt={place.name} className="disc-personal-card-img" />}
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
      {place.image_url && <img src={place.image_url} alt={place.name} className="disc-trending-card-img" />}
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
      {place.image_url && <img src={place.image_url} alt={place.name} className="disc-small-card-img" />}
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

function FeedCard({ place, matchScore, favorited, onHeart, onClick }) {
  const tag = place.google_review_count > 1000 ? '🔥 Popular'
    : (parseFloat(place.google_rating) || 0) >= 4.5 ? '⭐ Top rated'
    : null;
  const matchPct = matchScore != null ? Math.round(matchScore * 100) : null;

  return (
    <div className="disc-feed-card" onClick={onClick}>
      <div className="disc-feed-card-img-wrap">
        {place.image_url && <img src={place.image_url} alt={place.name} className="disc-feed-card-img" />}
        <div className="disc-card-top-badges">
          {place.category && <span className="disc-cat-badge" style={{ background: CAT_COLORS[place.category] }}>{place.category.charAt(0).toUpperCase() + place.category.slice(1)}</span>}
          {matchPct != null && <span className="disc-match-score">{matchPct}% match</span>}
        </div>
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
