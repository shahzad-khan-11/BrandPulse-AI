import AnalyticsRepository from '../repositories/AnalyticsRepository.js';

// @desc    Get precomputed analytics metrics for a brand
// @route   GET /api/analytics/brand/:brandId/:type
// @access  Private
export const getCachedAnalytics = async (req, res, next) => {
  const { brandId, type } = req.params;

  try {
    const metrics = await AnalyticsRepository.getLatestMetrics(brandId, type);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};
