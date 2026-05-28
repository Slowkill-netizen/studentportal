# Deployment Guide: Vercel + Render

## Backend Deployment (Render)

### Step 1: Prepare the Backend
Ensure your `package.json` has the correct start script (it does):
```json
"scripts": {
  "start": "node server/app.js",
  "dev": "nodemon server/app.js"
}
```

### Step 2: Create a Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Deploy Backend Service
1. Click **New +** → **Web Service**
2. Select your `studentportal` repository
3. Fill in the form:
   - **Name:** `studentportal-api`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server/app.js`
   - **Plan:** Free (if available)
4. Click **Create Web Service**

### Step 4: Add Environment Variables
In Render dashboard:
1. Go to your service → **Environment**
2. Add these variables:
   ```
   PORT=4000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://lonlee401_db_user:PFvAtXosOS10fFXi@cluster0.vykcx3c.mongodb.net/student_portal?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-key-change-this
   JWT_EXPIRES_IN=1h
   OTP_EXPIRES_MINUTES=5
   RESET_TOKEN_EXPIRES_MINUTES=15
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CLIENT_URL=https://studentportal-ochre.vercel.app
   COOKIE_SECRET=another-secret-key-change-this
   ```
3. Click **Save**

### Step 5: Wait for Deployment
Render will auto-deploy. You'll get a URL like: `https://studentportal-api.onrender.com`

**Note:** Free tier may take 30+ seconds on first request.

---

## Frontend Deployment (Vercel)

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

### Step 2: Deploy Frontend
1. Click **Add New Project**
2. Select your `studentportal` repository
3. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `./client`
   - **Build Command:** Leave blank (static files only)
   - **Output Directory:** `client`
4. Click **Deploy**

### Step 3: Add Environment Variables (if needed)
In Vercel dashboard → Project Settings → **Environment Variables**:
```
REACT_APP_API_URL=https://studentportal-api.onrender.com
```

### Step 4: Update Frontend API Calls
Verify your frontend files are using the correct API endpoint. Update `client/js/auth.js` and `client/js/dashboard.js` to use:
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';
```

Vercel will auto-deploy. You'll get: `https://studentportal-ochre.vercel.app`

---

## Final Configuration

### Update Backend Client URL
Go back to Render dashboard:
1. Edit the `CLIENT_URL` environment variable to: `https://studentportal-ochre.vercel.app`
2. Save and wait for re-deploy

### Test the Live Application
1. Visit: https://studentportal-ochre.vercel.app
2. Click **Login** or **Register**
3. Test the full flow (registration → OTP → dashboard)

---

## Troubleshooting

### Backend not connecting
- Check MongoDB Atlas whitelist includes Render's IP or use `0.0.0.0/0`
- Verify `MONGODB_URI` in Render environment variables
- Check backend logs in Render dashboard

### Frontend not connecting to backend
- Verify `CLIENT_URL` and `API_BASE` match your deployment URLs
- Check CORS settings in `server/app.js` allow your Vercel domain

### Emails not sending
- Use Gmail: enable 2FA, create App Password at https://myaccount.google.com/apppasswords
- Set `EMAIL_USER` and `EMAIL_PASS` in Render environment

---

## Production Security Checklist

- [ ] Change `JWT_SECRET` and `COOKIE_SECRET` to random values
- [ ] Use app-specific passwords for email (not your main password)
- [ ] Enable MongoDB Atlas IP whitelist or restrict to Render IP
- [ ] Set `NODE_ENV=production`
- [ ] Verify HTTPS is enabled (both platforms use HTTPS by default)
- [ ] Test OTP email delivery in production
- [ ] Test login/logout flow
