import express from 'express';
import { getCachedAnalytics, getLocationComparison, getTrendingHashtags, getTrendingTopics } from '../controllers/analyticsController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/location-comparison', getLocationComparison);
router.get('/trending-hashtags', getTrendingHashtags);
router.get('/trending-topics', getTrendingTopics);
router.get('/brand/:brandId/:type', getCachedAnalytics);

export default router;
