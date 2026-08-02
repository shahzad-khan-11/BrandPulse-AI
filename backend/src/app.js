import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './config/logger.js';
import errorHandler from './middleware/errorHandler.js';
import limiter from './middleware/rateLimiter.js';
import { setupSwagger } from './config/swagger.js';
import { healthCheck } from './database/index.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import mentionRoutes from './routes/mentionRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import sentimentRoutes from './routes/sentimentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import insightRoutes from './routes/insightRoutes.js';
import executiveReportRoutes from './routes/executiveReportRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app = express();

// Trust proxy for reverse proxy platforms like Render (resolves ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows static uploads to be loaded in frontend
}));

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static('./uploads'));

// HTTP Request Logger
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

// Apply Rate Limiter
app.use('/api', limiter);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/mentions', mentionRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/executive-reports', executiveReportRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/contact', contactRoutes);

// Setup Swagger Documentation
setupSwagger(app);

// ----------------------------------------------------
// Health Checks (Liveness and Readiness Probes)
// ----------------------------------------------------

// Liveness Check: Simple indicator the server process is alive
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Liveness Probe Success' });
});

// Readiness Check: Verifies dependent systems (e.g. MongoDB) are up
app.get('/health/readiness', (req, res) => {
  const dbHealth = healthCheck();
  if (dbHealth.status === 'UP') {
    res.status(200).json({ status: 'UP', database: dbHealth });
  } else {
    logger.warn('Readiness probe failed: Database offline');
    res.status(503).json({ status: 'DOWN', message: 'Service Unavailable (Database offline)', database: dbHealth });
  }
});

// Legacy/Backward Compatible Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

export default app;
