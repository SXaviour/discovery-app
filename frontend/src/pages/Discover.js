// Temporary placeholder shown after login while the full Discover page is being built
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Discover() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0a1e',
      gap: '16px',
    }}>
      <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700 }}>
        Welcome back, {user?.username || user?.email} 👋
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem' }}>
        You're logged in. The Discover page is coming soon.
      </p>
      <button
        onClick={handleLogout}
        style={{
          marginTop: '8px',
          padding: '10px 28px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '999px',
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Log Out
      </button>
    </div>
  );
}
