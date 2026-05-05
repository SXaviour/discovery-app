// Registration page, redirects to /discover after a new account is created
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImg from '../assets/images/herosectionsunset.png';
import './Auth.css';

function Register() {
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  const { register, user } = useAuth();

  // Redirect to onboarding after a fresh sign-up, or to discover if already logged in
  if (justRegistered) return <Navigate to="/onboarding" replace />;
  if (user) return <Navigate to="/discover" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, username);
      setJustRegistered(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-left">
        <img src={heroImg} alt="" className="auth-left-img" aria-hidden="true" />
        <div className="auth-left-overlay" />

        <Link to="/" className="auth-back">
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="auth-left-quote">
          <h2>Your City, Curated<br />For You</h2>
          <p>
            Join thousands of explorers getting smarter recommendations
            every day — powered by AI that learns your taste.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <Link to="/" className="auth-logo">
          Urban <span>Explorer</span>
        </Link>

        <div className="auth-form-wrap">
          <h1 className="auth-welcome">Create Account</h1>
          <p className="auth-sub">Sign up to start getting personalized recommendations</p>

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

            <label className="auth-label">Username <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="auth-input"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />

            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>

    </div>
  );
}

export default Register;
