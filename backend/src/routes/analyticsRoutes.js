import express from 'express';
import { 
  getCachedAnalytics, 
  getLocationComparison, 
  getTrendingHashtags, 
  getTrendingTopics,
  getBrandHealthScore,
  getBrandImpactScore,
  getWhatChanged,
  getExecutiveSummary,
  getPlatformIntelligence
} from '../controllers/analyticsController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/health-score', getBrandHealthScore);
router.get('/impact-score', getBrandImpactScore);
router.get('/what-changed', getWhatChanged);
router.get('/executive-summary', getExecutiveSummary);
router.get('/platform-intelligence', getPlatformIntelligence);
router.get('/location-comparison', getLocationComparison);
router.get('/trending-hashtags', getTrendingHashtags);
router.get('/trending-topics', getTrendingTopics);
router.get('/brand/:brandId/:type', getCachedAnalytics);

export default router;
