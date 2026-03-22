import React from 'react';
import { Link } from 'react-router-dom';

function Login() {
  return (
    <div className="login-page">
      <h1>Log In</h1>
      <p>Welcome back!</p>

      {/* Link that takes the user to the register page */}
      <p>
        Don't have an account? <Link to="/register">Sign up</Link>
      </p>
    </div>
  );
}

export default Login;
