# BrandPulse AI 🚀

> Enterprise-grade AI-powered brand monitoring, sentiment analysis, and reputation intelligence platform.

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/shahzad-khan-11/BrandPulse-AI)

---

## ✨ Features

- **Real-time Brand Monitoring** — Track mentions across the web
- **AI Sentiment Analysis** — Powered by Google Gemini AI
- **Universal News Intelligence** — NewsAPI + AI relevance ranking (no hardcoded brands)
- **Executive Reports** — Auto-generated PDF reports with reputation scores
- **AI Assistant** — Conversational brand insights
- **Multi-brand Analytics** — Dashboard with charts and trend analysis
- **n8n Workflow Automation** — Webhook-driven automated workflows
- **Notification System** — Real-time alerts for reputation spikes
- **Role-based Access Control** — Admin, Manager, Analyst roles

---

## 🏗️ Architecture

```
BrandPulse-AI/
├── frontend/          # React 19 + TypeScript + Vite + Tailwind CSS
├── backend/           # Node.js + Express + MongoDB + Gemini AI
├── n8n/               # n8n workflow automation configs
├── docs/              # Documentation
├── render.yaml        # Render (backend) deployment config
└── docker-compose.yml # Local development with Docker
```

---

## 🚀 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** (Vercel) | `https://brand-pulse-ai.vercel.app` |
| **Backend** (Render)  | `https://brandpulse-backend.onrender.com` |

---

## ⚙️ Local Development

### Prerequisites

- Node.js >= 18
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key
- NewsAPI key

### 1. Clone the repo

```bash
git clone https://github.com/shahzad-khan-11/BrandPulse-AI.git
cd BrandPulse-AI
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
cp .env.example .env
# Edit VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

### 4. Open the app

Navigate to `http://localhost:5173`

---

## 🌍 Production Deployment

### Backend → Render

1. Connect this GitHub repo at [render.com](https://render.com)
2. Select **Web Service**, root directory: `backend`
3. Build: `npm install` | Start: `npm start`
4. Set environment variables from `backend/.env.example`

### Frontend → Vercel

1. Connect this GitHub repo at [vercel.com](https://vercel.com)
2. Set root directory: `frontend`
3. Framework: **Vite**
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `NEWS_API_KEY` | NewsAPI.org API key |
| `NEWS_API_BASE_URL` | `https://newsapi.org/v2` |
| `FRONTEND_URL` | Your Vercel deployment URL |
| `SMTP_*` | Gmail SMTP credentials |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |

---

## 📄 License

MIT © 2026 BrandPulse AI
