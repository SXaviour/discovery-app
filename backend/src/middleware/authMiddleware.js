// requireAuth is a middleware function you can attach to any route that
// should only be accessible to logged-in users.
//
// How middleware works:
//   Express calls middleware functions in order before the final route handler.
//   If the user is NOT logged in, we respond with 401 and stop here (no `next()`).
//   If the user IS logged in, we call `next()` which passes control to the route handler.
//
// Usage example:
//   router.get('/my-profile', requireAuth, myProfileController);

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  }
  next();
}

module.exports = { requireAuth };
