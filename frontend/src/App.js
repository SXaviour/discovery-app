// Root of the application, sets up the authentication context and maps URLs to their pages

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Places from './pages/Places';
import Discover from './pages/Discover';
import PlaceDetail from './pages/PlaceDetail';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import SettingsPage from './pages/Settings';

function App() {
  return (
    // AuthProvider wraps everything so every page can access the logged-in user
    <AuthProvider>
      <BrowserRouter>
        {/* Each Route pairs a URL path with the page that should show up */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/places" element={<Places />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/places/:id" element={<PlaceDetail />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile"   element={<Profile />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Any URL that doesn't match the ones above gets sent back to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
