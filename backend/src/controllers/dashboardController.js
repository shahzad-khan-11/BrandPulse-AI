import BrandRepository from '../repositories/BrandRepository.js';
import BrandMentionRepository from '../repositories/BrandMentionRepository.js';

// @desc    Get dashboard summary statistics across all brands
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardSummary = async (req, res, next) => {
  try {
    const brands = await BrandRepository.findByOrganization(req.user.organization);
    const brandIds = brands.map(b => b._id);

    const totalMentions = await BrandMentionRepository.count({ brand: { $in: brandIds } });
    
    // Aggregation counts
    const positiveCount = await BrandMentionRepository.count({ brand: { $in: brandIds }, sentiment: 'positive' });
    const neutralCount = await BrandMentionRepository.count({ brand: { $in: brandIds }, sentiment: 'neutral' });
    const negativeCount = await BrandMentionRepository.count({ brand: { $in: brandIds }, sentiment: 'negative' });

    res.json({
      success: true,
      data: {
        brandsCount: brands.length,
        totalMentions,
        sentimentBreakdown: {
          positive: positiveCount,
          neutral: neutralCount,
          negative: negativeCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
