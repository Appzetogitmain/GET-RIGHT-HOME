import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Admin from '../models/Admin.js';
import Worker from '../models/Worker.js';
import Manager from '../models/Manager.js';

export const protect = async (req, res, next) => {
  try {
    let token;
//
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const authHeaderToken = req.headers.authorization.split(' ')[1];
      if (authHeaderToken && authHeaderToken !== 'null' && authHeaderToken !== 'undefined') {
        token = authHeaderToken;
      }
    }
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex !== -1) {
          const key = cookie.substring(0, separatorIndex).trim();
          const value = cookie.substring(separatorIndex + 1).trim();
          acc[key] = value;
        }
        return acc;
      }, {});
      if (cookies.token && cookies.token !== 'null' && cookies.token !== 'undefined') {
        token = cookies.token;
      }
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Direct role-based lookup in 1 query instead of 5 sequential waterfalls
    let user = null;
    const { id, role } = decoded;
    if (role === 'admin' || role === 'superadmin') {
      user = await Admin.findById(id);
    } else if (role === 'partner') {
      user = await Partner.findById(id);
    } else if (role === 'worker') {
      user = await Worker.findById(id);
    } else if (role === 'manager') {
      user = await Manager.findById(id);
    } else {
      user = await User.findById(id);
    }

    // Fallback in parallel only if role-specific query did not find the document
    if (!user) {
      const candidates = await Promise.all([
        User.findById(id),
        Partner.findById(id),
        Worker.findById(id),
        Admin.findById(id),
        Manager.findById(id)
      ]);
      user = candidates.find(c => c !== null);
    }

    if (!user) {
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    // Check Blocked Status
    if (user.isBlocked) {
      return res.status(403).json({
        message: 'Your account has been blocked by admin. Please contact support.',
        isBlocked: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('🛡️ Auth Middleware Error:', error);
    
    // Check for MongoDB related errors to prevent accidental 401s which trigger false logouts
    if (error.name && error.name.includes('Mongo')) {
      return res.status(503).json({ message: 'Database connection failed, please try again' });
    }
    
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};

export const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex !== -1) {
          const key = cookie.substring(0, separatorIndex).trim();
          const value = cookie.substring(separatorIndex + 1).trim();
          acc[key] = value;
        }
        return acc;
      }, {});
      token = cookies.token;
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user = null;
      const { id, role } = decoded;
      if (role === 'admin' || role === 'superadmin') {
        user = await Admin.findById(id);
      } else if (role === 'partner') {
        user = await Partner.findById(id);
      } else if (role === 'worker') {
        user = await Worker.findById(id);
      } else if (role === 'manager') {
        user = await Manager.findById(id);
      } else {
        user = await User.findById(id);
      }

      if (user && !user.isBlocked) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

export const authenticate = protect;
export const isWorker = authorizedRoles('worker');
