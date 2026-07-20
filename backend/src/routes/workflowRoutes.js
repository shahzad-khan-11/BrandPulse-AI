import express from 'express';
import { getWorkflowLogs } from '../controllers/workflowController.js';
import {
  detectLanguage,
  detectHyperlocal,
  detectThreat,
  generateSummary,
  sendEmail,
  saveReport,
  logActivity,
  collectMentions,
  calculateStats,
  positiveTrendCheck,
  notifyDashboard,
  getWorkflowStats
} from '../controllers/n8nWorkflowController.js';
import protect from '../middleware/auth.js';
import checkPermission from '../middleware/permission.js';
import { protectWebhook } from '../middleware/webhookAuth.js';

const router = express.Router();

// Frontend UI dashboard/logs endpoints
router.get('/logs', protect, checkPermission('workflow:logs:read'), getWorkflowLogs);
router.get('/stats/brand/:brandId', protect, getWorkflowStats);

// Incoming secure n8n automation helper endpoints
router.post('/n8n/detect-language', protectWebhook, detectLanguage);
router.post('/n8n/detect-hyperlocal', protectWebhook, detectHyperlocal);
router.post('/n8n/detect-threat', protectWebhook, detectThreat);
router.post('/n8n/generate-summary', protectWebhook, generateSummary);
router.post('/n8n/send-email', protectWebhook, sendEmail);
router.post('/n8n/save-report', protectWebhook, saveReport);
router.post('/n8n/log-activity', protectWebhook, logActivity);
router.get('/n8n/collect-mentions', protectWebhook, collectMentions);
router.post('/n8n/calculate-stats', protectWebhook, calculateStats);
router.get('/n8n/positive-trend-check', protectWebhook, positiveTrendCheck);
router.post('/n8n/notify-dashboard', protectWebhook, notifyDashboard);

export default router;
