import React from 'react';
import { Link } from 'react-router-dom';

function Register() {
  return (
    <div className="register-page">
      <h1>Create an Account</h1>
      <p>Join to get personalised travel recommendations.</p>

      {/* Link that takes the user to the login page */}
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default Register;
