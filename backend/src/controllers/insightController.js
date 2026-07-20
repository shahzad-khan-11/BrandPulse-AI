import BrandRepository from '../repositories/BrandRepository.js';
import BrandMentionRepository from '../repositories/BrandMentionRepository.js';
import AIInsight from '../models/AIInsight.js';
import { calculateBrandInsights } from '../services/insightService.js';
import logger from '../config/logger.js';

/**
 * Retrieves cached AI Insights and recommendations.
 * Scoped properly to the active user organization context.
 * 
 * @desc    Get AI Insights and recommendations
 * @route   GET /api/insights/brand/:brandId
 * @access  Private
 */
export const getBrandInsights = async (req, res, next) => {
  const { brandId } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  try {
    // Verify brand ownership scope
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Retrieve existing saved insights from MongoDB
    let insights = await AIInsight.findOne({ brand: brandId }).sort({ createdAt: -1 });

    // If no insights exist, or forceRefresh is true, calculate fresh ones
    if (!insights || forceRefresh) {
      logger.info(`[Insight Controller] AI Insights cache miss or refresh requested for brand: ${brand.name} (${brandId})`);
      const mentions = await BrandMentionRepository.find({ brand: brandId, isDeleted: false });
      
      // Calculate new insights (calculateBrandInsights will write to MongoDB)
      insights = await calculateBrandInsights(brandId, mentions, forceRefresh);
    }

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
};
