// Login page, redirects to /discover if the user is already signed in
import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImg from '../assets/images/loginmaps.png';
import './Auth.css';

function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/discover" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/discover');
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
          <h2>Discover Places<br />You'll Actually<br />Love</h2>
          <p>
            Personalized recommendations based on your taste,
            not just what's popular.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <Link to="/" className="auth-logo">
          Urban <span>Explorer</span>
        </Link>

        <div className="auth-form-wrap">
          <h1 className="auth-welcome">Welcome Back</h1>
          <p className="auth-sub">Enter your email and password to access your account</p>

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

            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <div className="auth-row">
              <label className="auth-remember">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#forgot" className="auth-forgot-link">Forgot Password?</a>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </div>

    </div>
  );
}

export default Login;
