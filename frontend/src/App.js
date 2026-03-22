import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Places from './pages/Places';

// The app uses a router so each URL shows a different page
// BrowserRouter — keeps track of which URL we're on
// Routes — looks at the URL and picks the right page to show
// Route — pairs a URL path with a page component
// Navigate — sends the user to a different URL automatically

function App() {
  return (
    // AuthProvider wraps everything so every page can access the logged-in user
    <AuthProvider>
    <BrowserRouter>
      <Routes>

        {/* The home page — shown when someone visits the root URL "/" */}
        <Route path="/" element={<Home />} />

        {/* Login page */}
        <Route path="/login" element={<Login />} />

        {/* Register / sign-up page */}
        <Route path="/register" element={<Register />} />

        {/* Places page — where users browse travel spots */}
        <Route path="/places" element={<Places />} />

        {/* If someone types a URL that doesn't exist, send them to home */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
