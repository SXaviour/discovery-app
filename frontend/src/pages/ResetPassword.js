// This page is for users who have clicked a password reset link from their email. It allows them to set a new password using the token in the URL.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import heroImg from '../assets/images/loginmaps.png';
import './Auth.css';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token');
  const navigate                = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 6)  return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'This link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-right" style={{ width: '100%' }}>
          <Link to="/" className="auth-logo">Urban <span>Explorer</span></Link>
          <div className="auth-form-wrap">
            <h1 className="auth-welcome">Invalid link</h1>
            <p className="auth-sub">This reset link is missing or malformed. Please request a new one.</p>
            <Link to="/forgot-password" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 24 }}>
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
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
          <h2>Choose a New<br />Password</h2>
          <p>Pick something secure and memorable.</p>
        </div>
      </div>

      <div className="auth-right">
        <Link to="/" className="auth-logo">Urban <span>Explorer</span></Link>

        <div className="auth-form-wrap">
          {done ? (
            <>
              <h1 className="auth-welcome">Password updated</h1>
              <p className="auth-sub">Your password has been reset. Redirecting you to login…</p>
            </>
          ) : (
            <>
              <h1 className="auth-welcome">New Password</h1>
              <p className="auth-sub">Enter and confirm your new password below.</p>

              <form onSubmit={handleSubmit}>
                <label className="auth-label">New password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />

                <label className="auth-label">Confirm password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />

                {error && <div className="auth-error">{error}</div>}

                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Reset Password'}
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
