const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.disabled) {
      return res.status(401).json({ message: 'Invalid authentication' });
    }

    req.user = { id: user._id, role: user.role };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Authentication token invalid or expired' });
  }
};
