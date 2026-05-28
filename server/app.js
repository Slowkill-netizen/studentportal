const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimiter = require('./middleware/rateLimiter');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const User = require('./models/User');
const { initDatabase, dbPath } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || `http://localhost:${PORT}`;

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize());
app.use(xss());
app.use(rateLimiter.globalLimiter);

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(morgan('combined'));
app.use(express.static(path.join(__dirname, '../client')));

const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    signed: false,
    maxAge: 3600,
  },
});

app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ csrfToken: req.csrfToken() });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

async function createAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@studentportal.local';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.warn('ADMIN_PASSWORD is not set. Skipping default admin creation.');
      return;
    }

    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      await User.create({
        name: 'Portal Admin',
        email: adminEmail,
        password: await require('bcryptjs').hash(adminPassword, 12),
        role: 'admin',
        courses: [],
        loginAttempts: 0,
      });
      console.log('Default admin user created:', adminEmail);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

async function startServer() {
  try {
    initDatabase();
    console.log('Connected to SQLite:', dbPath);
    await createAdminUser();

    if (process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH) {
      const keyPath = path.resolve(process.env.HTTPS_KEY_PATH);
      const certPath = path.resolve(process.env.HTTPS_CERT_PATH);
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        https.createServer({
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }, app).listen(PORT, () => {
          console.log(`HTTPS server listening on port ${PORT}`);
        });
        return;
      }
    }

    http.createServer(app).listen(PORT, () => {
      console.log(`HTTP server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

startServer();
