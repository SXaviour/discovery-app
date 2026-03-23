// Shared request setup — all API calls go through this so we don't repeat the base URL every time

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Sends the session cookie with every request so the backend knows who's logged in
});

export default api;
