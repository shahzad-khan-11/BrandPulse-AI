import { analyzeRegionalContent } from '../services/aiService.js';
import { resolveLocationForMention } from '../services/locationService.js';
import { analyzeMentionThreats } from '../services/threatService.js';
import { generateAIReportSummary, calculateReportStats, exportReportToPDF } from '../services/reportService.js';
import { sendCustomEmail } from '../services/emailService.js';
import ExecutiveReport from '../models/ExecutiveReport.js';
import WorkflowLog from '../models/WorkflowLog.js';
import Notification from '../models/Notification.js';
import BrandMention from '../models/BrandMention.js';
import User from '../models/User.js';
import Brand from '../models/Brand.js';
import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Endpoint to detect regional language
 * POST /api/workflows/n8n/detect-language
 */
export const detectLanguage = async (req, res, next) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  try {
    const analysis = await analyzeRegionalContent(content);
    res.json({ success: true, language: analysis.language, sentiment: analysis.sentiment, analysis });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to detect hyperlocal details
 * POST /api/workflows/n8n/detect-hyperlocal
 */
export const detectHyperlocal = async (req, res, next) => {
  const { content, language, source, manualLocation } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  try {
    const location = resolveLocationForMention(content, language || 'English', source || 'web', manualLocation);
    res.json({ success: true, location });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to classify threats
 * POST /api/workflows/n8n/detect-threat
 */
export const detectThreat = async (req, res, next) => {
  const { content, sentiment } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  try {
    const threat = await analyzeMentionThreats(content, sentiment || 'neutral');
    res.json({ success: true, threat });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to generate AI Executive Summary
 * POST /api/workflows/n8n/generate-summary
 */
export const generateSummary = async (req, res, next) => {
  const { stats, mentions } = req.body;
  if (!stats) {
    return res.status(400).json({ success: false, message: 'Stats are required' });
  }

  try {
    const sampleMentions = mentions || [];
    const aiSummary = await generateAIReportSummary(stats, sampleMentions);
    res.json({ success: true, aiSummary });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to send custom emails with optional PDF attachment
 * POST /api/workflows/n8n/send-email
 */
export const sendEmail = async (req, res, next) => {
  const { to, subject, html, reportId } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, message: 'to, subject, and html are required' });
  }

  try {
    const attachments = [];
    if (reportId) {
      const report = await ExecutiveReport.findById(reportId).populate('brand');
      if (report) {
        const pdfBuffer = await exportReportToPDF(report);
        attachments.push({
          filename: `executive_report_${reportId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      } else {
        logger.warn(`Email attachment report not found for id: ${reportId}`);
      }
    }

    const result = await sendCustomEmail(to, subject, html, attachments);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to save an automated Executive Report
 * POST /api/workflows/n8n/save-report
 */
export const saveReport = async (req, res, next) => {
  const { brandId, name, stats, aiSummary, filters, createdBy } = req.body;

  if (!brandId || !stats || !aiSummary) {
    return res.status(400).json({ success: false, message: 'brandId, stats, and aiSummary are required' });
  }

  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Attempt to assign a default user if createdBy is not provided or invalid
    let creatorId = createdBy;
    if (!creatorId || !mongoose.Types.ObjectId.isValid(creatorId)) {
      const defaultUser = await User.findOne({ organization: brand.organization });
      creatorId = defaultUser ? defaultUser._id : new mongoose.Types.ObjectId();
    }

    const report = await ExecutiveReport.create({
      name: name || `${brand.name} Automated Executive Report`,
      brand: brandId,
      organization: brand.organization,
      status: 'completed',
      filters: filters || {},
      stats,
      aiSummary,
      createdBy: creatorId,
      isAutomated: true,
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to log workflow execution history
 * POST /api/workflows/n8n/log-activity
 */
export const logActivity = async (req, res, next) => {
  const { brandId, workflowType, status, result, error } = req.body;

  if (!brandId || !workflowType || !status) {
    return res.status(400).json({ success: false, message: 'brandId, workflowType, and status are required' });
  }

  try {
    const log = await WorkflowLog.create({
      brand: brandId,
      workflowType: 'n8n_webhook_dispatch', // stay strictly compliant with enum
      status,
      result: {
        type: workflowType, // e.g. 'critical_alert', 'daily_intelligence', 'weekly_report', 'positive_trend'
        details: result || {},
      },
      error: error || undefined,
    });

    res.status(201).json({ success: true, log });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to collect mentions within date/range
 * GET /api/workflows/n8n/collect-mentions
 */
export const collectMentions = async (req, res, next) => {
  const { brandId, days, startDate, endDate } = req.query;

  if (!brandId) {
    return res.status(400).json({ success: false, message: 'brandId is required' });
  }

  try {
    const query = { brand: brandId };

    if (startDate || endDate) {
      query.publishedAt = {};
      if (startDate) query.publishedAt.$gte = new Date(startDate);
      if (endDate) query.publishedAt.$lte = new Date(endDate);
    } else {
      // Default to last N days
      const daysCount = parseInt(days, 10) || 1;
      const computedStart = new Date(Date.now() - daysCount * 24 * 60 * 60 * 1000);
      query.publishedAt = { $gte: computedStart };
    }

    const mentions = await BrandMention.find(query).sort({ publishedAt: -1 });
    res.json({ success: true, count: mentions.length, mentions });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to calculate metrics statistics
 * POST /api/workflows/n8n/calculate-stats
 */
export const calculateStats = async (req, res, next) => {
  const { mentions } = req.body;

  if (!mentions || !Array.isArray(mentions)) {
    return res.status(400).json({ success: false, message: 'mentions array is required' });
  }

  try {
    const stats = calculateReportStats(mentions);
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to verify positive trend threshold
 * GET /api/workflows/n8n/positive-trend-check
 */
export const positiveTrendCheck = async (req, res, next) => {
  const { brandId, threshold } = req.query;

  if (!brandId || !threshold) {
    return res.status(400).json({ success: false, message: 'brandId and threshold are required' });
  }

  try {
    const limit = parseInt(threshold, 10);
    const start24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await BrandMention.countDocuments({
      brand: brandId,
      sentiment: 'positive',
      publishedAt: { $gte: start24h },
    });

    res.json({
      success: true,
      trigger: count >= limit,
      count,
      threshold: limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to push dashboard notifications
 * POST /api/workflows/n8n/notify-dashboard
 */
export const notifyDashboard = async (req, res, next) => {
  const { brandId, title, message, type } = req.body;

  if (!brandId || !title || !message) {
    return res.status(400).json({ success: false, message: 'brandId, title, and message are required' });
  }

  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Fetch all users in organization to push notification to them
    const users = await User.find({ organization: brand.organization });

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'No notification recipients found' });
    }

    const notifications = users.map(user => ({
      recipient: user._id,
      title,
      message,
      type: type || 'info',
      isRead: false,
    }));

    await Notification.insertMany(notifications);
    res.json({ success: true, notificationsSent: notifications.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to fetch Workflow Automation stats for the Dashboard UI
 * GET /api/workflows/stats/brand/:brandId
 */
export const getWorkflowStats = async (req, res, next) => {
  const { brandId } = req.params;

  try {
    // Find last n8n workflow activity run log
    const lastRun = await WorkflowLog.findOne({ brand: brandId }).sort({ createdAt: -1 });

    // Count total automated executive reports
    const totalAutomatedReports = await ExecutiveReport.countDocuments({
      brand: brandId,
      isAutomated: true,
    });

    // Count total critical alert notification logs sent
    const totalAlertsSent = await WorkflowLog.countDocuments({
      brand: brandId,
      status: 'completed',
      'result.type': 'critical_alert',
    });

    // Count successful and failed workflow runs
    const successfulRuns = await WorkflowLog.countDocuments({
      brand: brandId,
      status: 'completed',
    });

    const failedRuns = await WorkflowLog.countDocuments({
      brand: brandId,
      status: 'failed',
    });

    // Execution time extraction from logs if present, otherwise default
    let executionTime = '1.2s (average)';
    if (lastRun && lastRun.result && lastRun.result.details && lastRun.result.details.duration) {
      executionTime = `${lastRun.result.details.duration}ms`;
    }

    // Determine the next sync time gracefully
    let nextSync = 'On Webhook Trigger';
    if (lastRun && lastRun.status === 'completed') {
      const lastRunTime = new Date(lastRun.createdAt).getTime();
      const nextSyncTime = new Date(lastRunTime + 60 * 60 * 1000); // 1 hour sync cycle fallback
      nextSync = nextSyncTime.toLocaleTimeString();
    }

    let status = 'inactive';
    if (lastRun) {
      if (lastRun.status === 'completed') status = 'healthy';
      else if (lastRun.status === 'failed') status = 'degraded';
      else if (lastRun.status === 'running') status = 'active';
    }

    res.json({
      success: true,
      data: {
        lastAutomationRun: lastRun ? lastRun.createdAt : null,
        automationStatus: status,
        totalAutomatedReports,
        totalAlertsSent,
        successfulRuns,
        failedRuns,
        executionTime,
        nextSync
      },
    });
  } catch (error) {
    next(error);
  }
};
