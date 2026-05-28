const crypto = require('crypto');
const validator = require('validator');
const { getDb } = require('../db');

function parseCourses(value) {
  try {
    return JSON.parse(value || '[]');
  } catch (_) {
    return [];
  }
}

function toUser(row) {
  if (!row) return null;
  return new UserRecord({
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    disabled: Boolean(row.disabled),
    courses: parseCourses(row.courses),
    otpHash: row.otpHash || undefined,
    otpExpires: row.otpExpires || undefined,
    resetTokenHash: row.resetTokenHash || undefined,
    resetTokenExpires: row.resetTokenExpires || undefined,
    loginAttempts: row.loginAttempts || 0,
    createdAt: row.createdAt,
  });
}

function serializeUser(user) {
  return {
    id: user._id || user.id || crypto.randomUUID(),
    name: String(user.name || '').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    password: user.password,
    role: user.role || 'student',
    disabled: user.disabled ? 1 : 0,
    courses: JSON.stringify(user.courses || []),
    otpHash: user.otpHash || null,
    otpExpires: user.otpExpires || null,
    resetTokenHash: user.resetTokenHash || null,
    resetTokenExpires: user.resetTokenExpires || null,
    loginAttempts: user.loginAttempts || 0,
    createdAt: user.createdAt || Date.now(),
  };
}

function validateUser(user) {
  if (!user.name || user.name.length < 2 || user.name.length > 60) {
    throw new Error('Name must be between 2 and 60 characters');
  }
  if (!validator.isEmail(user.email || '')) {
    throw new Error('Invalid email');
  }
  if (!user.password || user.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!['student', 'admin'].includes(user.role)) {
    throw new Error('Invalid role');
  }
}

class UserRecord {
  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    const data = serializeUser(this);
    validateUser(data);

    getDb().prepare(`
      UPDATE users
      SET name = ?, email = ?, password = ?, role = ?, disabled = ?, courses = ?,
          otpHash = ?, otpExpires = ?, resetTokenHash = ?, resetTokenExpires = ?,
          loginAttempts = ?
      WHERE id = ?
    `).run(
      data.name,
      data.email,
      data.password,
      data.role,
      data.disabled,
      data.courses,
      data.otpHash,
      data.otpExpires,
      data.resetTokenHash,
      data.resetTokenExpires,
      data.loginAttempts,
      data.id
    );

    Object.assign(this, toUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(data.id)));
    return this;
  }
}

class User {
  static async create(user) {
    const data = serializeUser(user);
    validateUser(data);

    getDb().prepare(`
      INSERT INTO users (
        id, name, email, password, role, disabled, courses, otpHash, otpExpires,
        resetTokenHash, resetTokenExpires, loginAttempts, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.name,
      data.email,
      data.password,
      data.role,
      data.disabled,
      data.courses,
      data.otpHash,
      data.otpExpires,
      data.resetTokenHash,
      data.resetTokenExpires,
      data.loginAttempts,
      data.createdAt
    );

    return this.findById(data.id);
  }

  static async findOne(criteria = {}) {
    if (criteria.email) {
      return toUser(getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(criteria.email).toLowerCase()));
    }

    if (criteria.resetTokenHash && criteria.resetTokenExpires && criteria.resetTokenExpires.$gt) {
      return toUser(getDb().prepare(
        'SELECT * FROM users WHERE resetTokenHash = ? AND resetTokenExpires > ?'
      ).get(criteria.resetTokenHash, criteria.resetTokenExpires.$gt));
    }

    return null;
  }

  static async findById(id) {
    return toUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(String(id)));
  }

  static async findByIdAndUpdate(id, updates = {}) {
    const user = await this.findById(id);
    if (!user) return null;

    if (updates.name !== undefined) user.name = String(updates.name).trim();
    if (updates.email !== undefined) user.email = String(updates.email).trim().toLowerCase();
    if (updates.password !== undefined) user.password = updates.password;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.disabled !== undefined) user.disabled = Boolean(updates.disabled);
    if (updates.courses !== undefined) user.courses = updates.courses;

    return user.save();
  }

  static async deleteById(id) {
    const result = getDb().prepare('DELETE FROM users WHERE id = ?').run(String(id));
    return result.changes > 0;
  }

  static async find(criteria = {}) {
    if (criteria.role) {
      return getDb()
        .prepare('SELECT * FROM users WHERE role = ? ORDER BY createdAt DESC')
        .all(criteria.role)
        .map(toUser);
    }

    return getDb().prepare('SELECT * FROM users ORDER BY createdAt DESC').all().map(toUser);
  }
}

module.exports = User;
