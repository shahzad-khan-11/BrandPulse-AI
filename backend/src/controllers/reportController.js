import ReportRepository from '../repositories/ReportRepository.js';
import BrandRepository from '../repositories/BrandRepository.js';
import { sendReportGeneratedEmail } from '../services/emailService.js';

// @desc    Get all brand reports
// @route   GET /api/reports/brand/:brandId
// @access  Private
export const getReports = async (req, res, next) => {
  const { brandId } = req.params;
  try {
    const reports = await ReportRepository.find({ brand: brandId });
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new report entry (optionally uploading document file)
// @route   POST /api/reports/brand/:brandId
// @access  Private
export const createReport = async (req, res, next) => {
  const { brandId } = req.params;
  const { name, summary } = req.body;

  try {
    // Verify brand ownership scope
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    let fileUrl = '';
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    const report = await ReportRepository.create({
      name,
      brand: brandId,
      organization: req.user.organization,
      summary,
      fileUrl,
      status: 'completed',
      createdBy: req.user._id,
    });

    // Send report generated email notification
    sendReportGeneratedEmail(req.user.email, req.user.name, report.name, brand.name);

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a report (Soft Delete)
// @route   DELETE /api/reports/:id
// @access  Private
export const deleteReport = async (req, res, next) => {
  try {
    const report = await ReportRepository.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    await ReportRepository.delete(report._id);
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
};
