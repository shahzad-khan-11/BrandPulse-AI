import SentimentRepository from '../repositories/SentimentRepository.js';

// @desc    Get daily sentiment timeline for a brand
// @route   GET /api/sentiment/brand/:brandId/timeline
// @access  Private
export const getDailySentimentTimeline = async (req, res, next) => {
  const { brandId } = req.params;
  const { limit } = req.query;

  try {
    const data = await SentimentRepository.getDailyTimeline(
      brandId,
      limit ? parseInt(limit, 10) : 7
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
