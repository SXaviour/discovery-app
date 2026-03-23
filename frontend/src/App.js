// Root of the app — sets up authentication and maps URLs to pages

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Places from './pages/Places';

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
          <Route path="/places" element={<Places />} />

          {/* Any URL that doesn't match the ones above gets sent back to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
