const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'No token provided. Please authenticate.'
      });
    }
    
    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        error: 'ServerError',
        message: 'Server configuration error'
      });
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    
    // Add user info to request object
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Invalid token. Please authenticate.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Token expired. Please login again.'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'AuthenticationError',
      message: 'Authentication failed'
    });
  }
};

module.exports = auth;
