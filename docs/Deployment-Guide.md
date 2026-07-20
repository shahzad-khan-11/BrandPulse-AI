# Production Deployment Guide 🚀

This document details the recommended steps for deploying BrandPulse AI in production environments.

---

## 1. Containerized Deployment (Docker Compose)
Deploy all application containers to a single host (such as AWS EC2 or DigitalOcean Droplet):

### 1.1 Step-by-Step Setup
1. Clone the repository to the host server.
2. Configure production environments inside `backend/.env` and `frontend/.env`.
3. Spin up services in daemon mode:
   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```
4. Verify container liveness:
   ```bash
   docker-compose ps
   ```

---

## 2. Serverless & Managed PaaS Deployments

### 2.1 Backend (e.g. Render, Heroku, AWS App Runner)
- Mount environment variables directly on the host console.
- Configure MongoDB connection strings using a managed database service (like MongoDB Atlas).
- Build command: `npm install`
- Start command: `node src/index.js`

### 2.2 Frontend Static Hosting (e.g. Vercel, Netlify)
- Deploy the compiled output build.
- Build command: `npm run build`
- Output directory: `dist`
- Redirect rules: Configure fallback route redirects (`/*` to `/index.html`) to support client-side routing.
