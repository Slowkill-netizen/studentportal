# Vulnerability Assessment Report

## Summary
This Student Portal has been designed with security in mind to mitigate common OWASP Top 10 vulnerabilities, with a focus on authentication, MFA, session management, and input validation.

## Mitigations

- **Injection (A01)**: The backend uses Mongoose ORM and `express-mongo-sanitize` to remove malicious operators from incoming payloads. All database queries are executed with validated fields.
- **Broken Authentication (A02)**: Passwords are hashed with `bcrypt`, JWTs are signed with a secret, and MFA is enforced via email OTP. Login attempts are rate limited.
- **Sensitive Data Exposure (A03)**: Passwords and OTP values are never stored in plaintext. Cookies are set as `HttpOnly`, `Secure`, and `SameSite=Strict` for deployed environments.
- **XML External Entities (A04)**: No XML parsing is used.
- **Broken Access Control (A05)**: Role middleware protects admin and student routes. Unauthorized roles receive a `403 Forbidden` response.
- **Security Misconfiguration (A06)**: `helmet` is used for secure HTTP headers; `dotenv` ensures environment-specific configuration.
- **Cross-Site Scripting (A07)**: `xss-clean` sanitizes request bodies and frontend forms validate inputs.
- **Insecure Deserialization (A08)**: The app does not deserialize untrusted data from clients beyond JSON payloads.
- **Using Components with Known Vulnerabilities (A09)**: Dependencies are limited to modern, maintained packages.
- **Insufficient Logging & Monitoring (A10)**: Failed and successful logins are stored with timestamps and IP addresses.

## Testing Checklist

- [ ] Validate registration with strong password requirements.
- [ ] Verify login flow and OTP delivery.
- [ ] Confirm OTP expiration after 5 minutes.
- [ ] Confirm disabled accounts cannot log in.
- [ ] Test CSRF token enforcement on authenticated POST requests.
- [ ] Attempt JavaScript injection in form fields.
- [ ] Attempt NoSQL injection via email or password fields.
- [ ] Validate role restriction on admin routes.
- [ ] Inspect secure cookie flags in production.
