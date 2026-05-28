const { getDb } = require('../db');

function toLog(row) {
  if (!row) return null;
  return {
    _id: row.id,
    user: row.user,
    email: row.email,
    action: row.action,
    success: Boolean(row.success),
    ip: row.ip,
    createdAt: row.createdAt,
  };
}

class ActivityLog {
  static async create(log) {
    const createdAt = Date.now();
    const result = getDb().prepare(`
      INSERT INTO activity_logs (user, email, action, success, ip, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      log.user ? String(log.user) : null,
      log.email || null,
      log.action,
      log.success ? 1 : 0,
      log.ip || null,
      createdAt
    );

    return toLog(getDb().prepare('SELECT * FROM activity_logs WHERE id = ?').get(result.lastInsertRowid));
  }

  static async latest(limit = 100) {
    return getDb()
      .prepare('SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ?')
      .all(limit)
      .map(toLog);
  }
}

module.exports = ActivityLog;
