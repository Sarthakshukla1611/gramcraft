const AuditLog = require('../models/AuditLog');

async function logAudit(req, action, entity, entityId, before, after) {
  try {
    const actor = req?.user
      ? {
          userId: req.user._id,
          name: req.user.name,
          role: req.user.role,
        }
      : {
          name: 'System / Guest',
          role: 'system',
        };

    const ip = req?.ip || req?.connection?.remoteAddress || 'unknown';

    await AuditLog.create({
      actor,
      action,
      entity,
      entityId: entityId ? entityId.toString() : null,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null,
      timestamp: new Date(),
      ip,
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log entry:', error.message);
  }
}

module.exports = { logAudit };
