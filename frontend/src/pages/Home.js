// Landing page shown to all visitors before they sign in
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Star, Heart, MapPin, Menu, X } from 'lucide-react';
import heroImg from '../assets/images/heroimageday2.png';
import './Home.css';

export default function Home() {
  useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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

      <footer className="footer">
        ©Copyright Griffith College Dublin – Saviour Apkan
      </footer>

    </div>
  );
}
