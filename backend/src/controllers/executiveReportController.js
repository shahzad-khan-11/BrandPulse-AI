import ExecutiveReport from '../models/ExecutiveReport.js';
import BrandRepository from '../repositories/BrandRepository.js';
import BrandMention from '../models/BrandMention.js';
import { 
  buildReportFilters, 
  calculateReportStats, 
  generateAIReportSummary,
  exportReportToCSV,
  exportReportToPDF
} from '../services/reportService.js';
import { calculateBrandInsights } from '../services/insightService.js';
import { pushNotification } from '../services/notificationService.js';
import logger from '../config/logger.js';

/**
 * Generates a new executive intelligence report.
 * 
 * @desc    Generate executive report
 * @route   POST /api/executive-reports/brand/:brandId/generate
 * @access  Private
 */
export const generateExecutiveReport = async (req, res, next) => {
  const { brandId } = req.params;
  const { name, startDate, endDate, language, sentiment, priority, source, country, state, city } = req.body;

  try {
    // 1. Verify brand ownership scope
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Caching check (Part 2 / Part 4)
    const CACHE_TTL_MS = 10 * 60 * 1000;
    const cachedReport = await ExecutiveReport.findOne({
      brand: brandId,
      organization: req.user.organization,
      createdAt: { $gte: new Date(Date.now() - CACHE_TTL_MS) }
    }).sort({ createdAt: -1 });

    if (cachedReport) {
      logger.info(`[Report Controller] Cache HIT: returning cached executive report for brand ${brandId}`);
      
      await pushNotification({
        userId: req.user._id,
        organizationId: req.user.organization,
        brandId: brandId,
        title: 'AI Report Retrieved from Cache',
        message: `Retrieved cached report "${cachedReport.name}" (cached within last 10 min).`,
        category: 'report',
        priority: 'INFO',
        actionUrl: `/reports`,
        metadata: { brandName: brand.name, reportId: cachedReport._id }
      });
      return res.status(200).json({ success: true, data: cachedReport });
    }

    // 2. Fetch mentions based on filters
    const filterParams = { startDate, endDate, language, sentiment, priority, source, country, state, city };
    const query = buildReportFilters(brandId, filterParams);
    const mentions = await BrandMention.find(query);

    if (!mentions || mentions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No sufficient data available to generate an AI report.'
      });
    }

    // 3. Compute stats
    const stats = calculateReportStats(mentions);

    // 4. Request Gemini Executive Summary
    const aiSummary = await generateAIReportSummary(stats, mentions);

    // 5. Create report document
    const report = await ExecutiveReport.create({
      name: name || `${brand.name} Executive Report`,
      brand: brandId,
      organization: req.user.organization,
      status: 'completed',
      filters: filterParams,
      stats,
      aiSummary,
      createdBy: req.user._id
    });

    // Recalculate and update AI Insights using all current brand mentions
    try {
      const allMentions = await BrandMention.find({ brand: brandId, isDeleted: false });
      await calculateBrandInsights(brandId, allMentions, true);
      logger.info(`[Generate Report] Generated fresh AI insights for brand ${brand.name}`);
    } catch (insightsErr) {
      logger.error(`[Generate Report] Failed to recalculate AI insights: ${insightsErr.message}`);
    }

    // Generate workspace notification for report generation
    await pushNotification({
      userId: req.user._id,
      organizationId: req.user.organization,
      brandId: brandId,
      title: 'AI Executive Report Generated',
      message: `Executive intelligence report "${report.name}" has been generated successfully.`,
      category: 'report',
      priority: 'INFO',
      actionUrl: `/reports`,
      metadata: { brandName: brand.name, reportId: report._id }
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all generated executive reports for a brand.
 * 
 * @desc    Get executive reports list
 * @route   GET /api/executive-reports/brand/:brandId
 * @access  Private
 */
export const getExecutiveReports = async (req, res, next) => {
  const { brandId } = req.params;

  try {
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const reports = await ExecutiveReport.find({ brand: brandId }).sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns details of a specific report document.
 */
export const getExecutiveReportDetails = async (req, res, next) => {
  try {
    const report = await ExecutiveReport.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft deletes an executive report document.
 */
export const deleteExecutiveReport = async (req, res, next) => {
  try {
    const report = await ExecutiveReport.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Call base Mongoose soft delete hook
    await report.deleteOne();
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles exporting report documents as PDF, CSV, or JSON.
 * 
 * @desc    Export executive report
 * @route   GET /api/executive-reports/:id/export
 * @access  Private
 */
export const exportExecutiveReport = async (req, res, next) => {
  const { id } = req.params;
  const format = (req.query.format || 'pdf').toLowerCase();

  try {
    const report = await ExecutiveReport.findOne({
      _id: id,
      organization: req.user.organization
    }).populate('brand');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=report_${id}.json`);
      return res.json(report);
    }

    // Fetch mentions matching query to construct export
    const query = buildReportFilters(report.brand, report.filters || {});
    const mentions = await BrandMention.find(query);

    if (format === 'csv') {
      const csvBuffer = exportReportToCSV(report, mentions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report_${id}.csv`);
      return res.send(csvBuffer);
    }

    // Fallback: PDF download
    const pdfBuffer = await exportReportToPDF(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerates an existing report document with fresh timeline values.
 * 
 * @desc    Regenerate report details
 * @route   POST /api/executive-reports/:id/regenerate
 * @access  Private
 */
export const regenerateExecutiveReport = async (req, res, next) => {
  const { id } = req.params;

  try {
    const report = await ExecutiveReport.findOne({
      _id: id,
      organization: req.user.organization
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Fetch matching mentions
    const query = buildReportFilters(report.brand, report.filters || {});
    const mentions = await BrandMention.find(query);

    // Compute fresh stats
    const stats = calculateReportStats(mentions);

    // AI Summary recalculation
    const aiSummary = await generateAIReportSummary(stats, mentions);

    // Update existing record
    report.stats = stats;
    report.aiSummary = aiSummary;
    report.status = 'completed';
    await report.save();

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};
