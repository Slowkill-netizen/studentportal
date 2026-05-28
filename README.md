# Secure Student Portal with MFA

A secure student portal web application built with Node.js, Express, SQLite, and modern security practices.

## Features

- Secure user registration and login
- Multi-factor authentication (MFA) using email OTP
- Role-based access control (Student / Admin)
- JWT authentication and secure cookies
- Password hashing with bcrypt
- CSRF protection, input sanitization, and HTTP headers hardening
- Rate limiting to block brute force attacks
- Responsive frontend design with client-side validation
- Admin dashboard for managing students and courses

## Project Structure

```text
student-portal/
client/
server/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
  app.js
.env.example
package.json
README.md
```

## Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Keep `SQLITE_DB_PATH=./data/student_portal.db` or choose another local database file path.
4. Set `ADMIN_PASSWORD` in `.env` if you want the app to create the default admin user.
5. Configure SMTP settings so OTP and reset emails can be sent.
6. Run the application:
   ```bash
   npm run dev
   ```
7. Open your browser at `http://localhost:4000` to use the portal.
   - `http://localhost:4000/login.html`
   - `http://localhost:4000/register.html`
   - `http://localhost:4000/otp.html`
   - `http://localhost:4000/student.html`
   - `http://localhost:4000/admin.html`

## Security Notes

- MFA flow uses a temporary OTP token stored in secure cookies.
- Passwords are never stored in plaintext.
- CSRF tokens are issued through a dedicated endpoint and validated on write requests.
- Helmet config sets safe HTTP headers.
- Express-rate-limit limits authentication attempts.
- Input validation is enforced with `express-validator`.

## Deployment

- Frontend: Vercel
- Backend: Render, Railway, or any Node.js host
- Ensure `NODE_ENV=production` and set `CLIENT_URL` to your deployed frontend domain.
- Configure HTTPS certificates or use platform-managed TLS.
