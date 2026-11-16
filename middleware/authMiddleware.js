import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 1. Pehle Employee model mein check karein
      let user = await Employee.findById(decoded.id).select('-passwordHash');
      if (user) {
        req.employee = user;
        req.user = user;
        return next();
      }

      // 2. Agar Employee na mile, toh Admin model mein check karein
      user = await Admin.findById(decoded.id).select('-password');
      if (user) {
        req.admin = user;
        req.user = user;
        return next();
      }

      return res.status(401).json({ message: 'Not authorized, user not found' });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
});