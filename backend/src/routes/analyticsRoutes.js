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
  getPlatformIntelligence,
  getAIActionPlan,
  getReputationRisk,
  getViralIssues,
  getLocationIntelligence,
  getPriorityQueue,
  getCustomerVoice,
  getSentimentDrivers,
  getLanguageIntelligence,
  getCityPlatformMatrix,
  checkResponseSafety
} from '../controllers/analyticsController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/health-score', getBrandHealthScore);
router.get('/impact-score', getBrandImpactScore);
router.get('/what-changed', getWhatChanged);
router.get('/executive-summary', getExecutiveSummary);
router.get('/platform-intelligence', getPlatformIntelligence);
router.get('/action-plan', getAIActionPlan);
router.get('/reputation-risk', getReputationRisk);
router.get('/viral-issues', getViralIssues);
router.get('/location-intelligence', getLocationIntelligence);
router.get('/priority-queue', getPriorityQueue);
router.get('/customer-voice', getCustomerVoice);
router.get('/drivers', getSentimentDrivers);
router.get('/language-intelligence', getLanguageIntelligence);
router.get('/city-platform-matrix', getCityPlatformMatrix);
router.post('/response-safety-check', checkResponseSafety);
router.get('/location-comparison', getLocationComparison);
router.get('/trending-hashtags', getTrendingHashtags);
router.get('/trending-topics', getTrendingTopics);
router.get('/brand/:brandId/:type', getCachedAnalytics);

export default router;
