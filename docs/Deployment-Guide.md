# Production Deployment Guide 🚀

> Complete step-by-step guide for deploying BrandPulse AI to Vercel (frontend) and Render (backend).

---

## 📋 Overview

| Service    | Platform | URL                                                  |
|------------|----------|------------------------------------------------------|
| Frontend   | Vercel   | `https://brand-pulse-ai.vercel.app`                  |
| Backend    | Render   | `https://brandpulse-backend.onrender.com`            |
| Repository | GitHub   | `https://github.com/shahzad-khan-11/BrandPulse-AI`  |

---

## 🔄 Auto-Deploy Flow

```
Code Push to main
      │
      ├──▶ GitHub Actions CI (build check + syntax check)
      │
      ├──▶ Vercel detects push → builds frontend → deploys to CDN
      │
      └──▶ Render detects push → installs deps → starts backend
```

---

## 1. Backend → Render

### Step 1: Connect GitHub Repository
1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect GitHub account → Select `shahzad-khan-11/BrandPulse-AI`
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Set **Node Version**: `20`
7. Enable **Auto-Deploy** (on push to `main`)

### Step 2: Set Environment Variables in Render Dashboard
Navigate to: Dashboard → brandpulse-backend → **Environment**

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/brandpulse?retryWrites=true&w=majority
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=<your-gemini-api-key>
NEWS_API_KEY=<your-newsapi-key>
NEWS_API_BASE_URL=https://newsapi.org/v2
FRONTEND_URL=https://brand-pulse-ai.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-gmail>@gmail.com
SMTP_PASS=<your-16-char-app-password>
EMAIL_FROM=<your-gmail>@gmail.com
```

### Step 3: Health Check
Render will verify the service at: `GET /health`

Expected response: `{ "status": "OK", "timestamp": "..." }`

---

## 2. Frontend → Vercel

### Step 1: Connect GitHub Repository
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import `shahzad-khan-11/BrandPulse-AI`
3. Set **Root Directory**: `frontend`
4. Set **Framework Preset**: Vite
5. Set **Build Command**: `npm run build`
6. Set **Output Directory**: `dist`
7. Enable **Auto-Deploy** on push to `main`

### Step 2: Set Environment Variables in Vercel Dashboard
Navigate to: Project → **Settings → Environment Variables**

```env
VITE_API_URL=https://brandpulse-backend.onrender.com/api
```

> ⚠️ Make sure to set this for **Production**, **Preview**, and **Development** environments.

### Step 3: Redeploy
After setting the env var, trigger a manual redeploy from the Vercel dashboard.

---

## 3. GitHub Actions CI/CD

The workflow at `.github/workflows/deploy.yml` automatically:
- Runs TypeScript compilation + Vite build on every push
- Checks backend Node.js syntax
- Reports deployment status

### Add GitHub Secret for CI:
Go to: Repository → **Settings → Secrets and variables → Actions**

| Secret Name    | Value                                                   |
|----------------|---------------------------------------------------------|
| `VITE_API_URL` | `https://brandpulse-backend.onrender.com/api`           |

---

## 4. Docker (Local / Self-Hosted)

```bash
# 1. Copy env files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Fill in values in backend/.env and frontend/.env

# 3. Start all services
docker-compose up -d --build

# 4. Verify
curl http://localhost:5000/health
open http://localhost:5173
```

---

## 5. Troubleshooting

### CORS Errors
Ensure `FRONTEND_URL` in Render matches your Vercel domain exactly (no trailing slash).

### MongoDB Connection Fails
- Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access (for Render)
- Verify `MONGODB_URI` is correct

### Build Fails on Vercel
- Check that `VITE_API_URL` env var is set
- Ensure root directory is set to `frontend` in Vercel project settings

### Cold Start on Render Free Plan
Render free tier spins down after 15 minutes of inactivity. First request may take 30–60s.

---

## 6. Production Checklist

- [ ] `NODE_ENV=production` set on Render
- [ ] `FRONTEND_URL` on Render matches Vercel domain
- [ ] `VITE_API_URL` on Vercel matches Render backend URL
- [ ] MongoDB Atlas IP whitelist allows Render IPs
- [ ] GitHub Actions workflow passing
- [ ] Auto-deploy enabled on both Vercel and Render
