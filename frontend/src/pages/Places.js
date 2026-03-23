import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Places() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="places-page">
      <h1>Discover Places</h1>
      <p>Welcome, {user?.username || user?.email}!</p>
      <button onClick={handleLogout}>Log Out</button>
      <p>Places will appear here once we build the places system.</p>
    </div>
  );
}

export default Places;
