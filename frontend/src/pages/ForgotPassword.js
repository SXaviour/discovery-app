// This page is for users who forgot their password. It allows them to enter their email and receive a reset link.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import heroImg from '../assets/images/loginmaps.png';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-left">
        <img src={heroImg} alt="" className="auth-left-img" aria-hidden="true" />
        <div className="auth-left-overlay" />
        <Link to="/login" className="auth-back">
          <ArrowLeft size={14} /> Back to login
        </Link>
        <div className="auth-left-quote">
          <h2>Recover Your<br />Account</h2>
          <p>We'll send a reset link to your email address.</p>
        </div>
      </div>

      <div className="auth-right">
        <Link to="/" className="auth-logo">Urban <span>Explorer</span></Link>

        <div className="auth-form-wrap">
          {sent ? (
            <>
              <h1 className="auth-welcome">Check your email</h1>
              <p className="auth-sub" style={{ lineHeight: 1.7 }}>
                If <strong>{email}</strong> is registered, a password reset link is on its way. Check your spam folder if it doesn't arrive within a minute.
              </p>
              <Link to="/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', marginTop: 24, textDecoration: 'none' }}>
                Back to login
              </Link>
            </>
          ) : (
            <>
              <h1 className="auth-welcome">Forgot Password?</h1>
              <p className="auth-sub">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit}>
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                {error && <div className="auth-error">{error}</div>}

                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="auth-footer">
          Remembered it? <Link to="/login">Sign In</Link>
        </p>
      </div>

    </div>
  );
}
