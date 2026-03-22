import axios from 'axios';

// Set up a shared "request sender" that all our API calls will use
// Instead of typing the full URL every time, we just type the endpoint path
// e.g. api.get('/auth/me') instead of axios.get('http://localhost:5000/api/auth/me')

const api = axios.create({
  baseURL: 'http://localhost:5000/api',

  // This makes sure the session cookie gets sent along with every request
  // Without this, the backend won't know who is logged in
  withCredentials: true,
});

export default api;
