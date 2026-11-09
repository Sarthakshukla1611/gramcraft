const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');
const Village = require('../models/Village');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// Optional authentication - populates req.user if token is valid, but allows unauthenticated access as viewer
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Ignore token errors for optional auth
      }
    }
    next();
  } catch (error) {
    next();
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: role '${req.user.role}' lacks permission for this action`,
      });
    }

    next();
  };
}

async function enforceVillageScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { role, scope } = req.user;
  if (role === 'admin') {
    return next();
  }

  if (role === 'viewer') {
    return res.status(403).json({ success: false, error: 'Viewer accounts have read-only access' });
  }

  const villageId = req.params.villageId || req.params.id || req.body.villageId;
  if (!villageId) {
    return next();
  }

  try {
    const village = await Village.findById(villageId);
    if (!village) {
      return res.status(404).json({ success: false, error: 'Village not found' });
    }

    if (role === 'district_officer') {
      if (scope.district && village.district.toLowerCase() !== scope.district.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Village '${village.name}' is outside your assigned district (${scope.district})`,
        });
      }
    } else if (role === 'block_planner') {
      const matchDistrict = !scope.district || village.district.toLowerCase() === scope.district.toLowerCase();
      const matchBlock = scope.block && village.block.toLowerCase() === scope.block.toLowerCase();
      if (!matchDistrict || !matchBlock) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Village '${village.name}' is outside your assigned block (${scope.block})`,
        });
      }
    } else if (role === 'village_officer') {
      const assignedIds = (scope.villageIds || []).map(id => id.toString());
      if (!assignedIds.includes(village._id.toString())) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: You are only permitted to manage your assigned village`,
        });
      }
    }

    req.targetVillage = village;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error checking scope permissions' });
  }
}

async function enforceBlockScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { role, scope } = req.user;
  if (role === 'admin') {
    return next();
  }

  if (role === 'viewer') {
    return res.status(403).json({ success: false, error: 'Viewer accounts have read-only access' });
  }

  const targetBlock = req.params.block || req.body.blockId || req.query.block;
  if (!targetBlock) {
    return next();
  }

  if (role === 'block_planner') {
    if (scope.block && targetBlock.toLowerCase() !== scope.block.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Target block '${targetBlock}' does not match your assigned block (${scope.block})`,
      });
    }
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  enforceVillageScope,
  enforceBlockScope,
};
