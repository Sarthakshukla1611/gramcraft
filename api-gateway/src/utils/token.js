const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gramcraft_super_secret_jwt_key_2026_securerandom';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'gramcraft_refresh_token_super_secret_key_2026';

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      scope: user.scope,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
