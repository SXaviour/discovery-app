import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { user } = useAuth();
  
  

  return (
    <div className="home-page">
      <h1>Welcome to the Travel App</h1>

      {user ? (
        // Logged in — show their name and a link to the places page
        <div>
          <p>Hello, {user.username || user.email}!</p>
          <Link to="/places">Discover Places</Link> <br />
        </div>
      ) : (
        // Not logged in — show login and register buttons
        <div>
          <p>Find your next favourite destination.</p>
          <Link to="/login">Log In</Link>
          <Link to="/register">Sign Up</Link>
        </div>
      )}
    </div>
  );
}

export default Home;
