const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// Enforce admin role for all admin routes
router.use(authenticate, requireRole('admin'));

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').populate('scope.villageIds', 'name code block');
    return res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, scope, language } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Name, email, password, and role are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      scope: scope || {},
      language: language || 'en',
    });

    await logAudit(req, 'ADMIN_USER_CREATE', 'User', user._id, null, { email: user.email, role: user.role });

    return res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        scope: user.scope,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const before = JSON.parse(JSON.stringify(user));
    const { name, role, scope, language, password } = req.body;

    if (name) user.name = name;
    if (role) user.role = role;
    if (scope) user.scope = scope;
    if (language) user.language = language;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();
    await logAudit(req, 'ADMIN_USER_UPDATE', 'User', user._id, before, user);

    return res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        scope: user.scope,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await logAudit(req, 'ADMIN_USER_DELETE', 'User', user._id, user, null);
    return res.json({ success: true, message: `User ${user.email} deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await SystemSetting.findOne({ key: 'global_config' });
    if (!settings) {
      settings = await SystemSetting.create({ key: 'global_config' });
    }
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  try {
    const { weights, thresholds, gamificationValues, publicScoreboardEnabled } = req.body;
    let settings = await SystemSetting.findOne({ key: 'global_config' });
    if (!settings) {
      settings = new SystemSetting({ key: 'global_config' });
    }

    const before = JSON.parse(JSON.stringify(settings));

    if (weights) settings.weights = weights;
    if (thresholds) settings.thresholds = thresholds;
    if (gamificationValues) settings.gamificationValues = gamificationValues;
    if (publicScoreboardEnabled !== undefined) settings.publicScoreboardEnabled = publicScoreboardEnabled;
    settings.updatedBy = req.user._id;
    settings.updatedAt = new Date();

    await settings.save();
    await logAudit(req, 'ADMIN_SETTINGS_UPDATE', 'SystemSetting', settings._id, before, settings);

    return res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/audit
router.get('/audit', async (req, res) => {
  try {
    const { action, entity, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
