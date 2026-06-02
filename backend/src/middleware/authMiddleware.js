// requireAuth is a middleware function you can attach to any route that should only be accessible to logged-in users.


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
