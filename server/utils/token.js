const crypto = require('crypto');
const jwt = require('jsonwebtoken');

exports.generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.hashToken = token => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

exports.generateJwt = (payload, expiresIn) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};
