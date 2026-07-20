import express from 'express';
import { getCachedAnalytics } from '../controllers/analyticsController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/brand/:brandId/:type', getCachedAnalytics);

export default router;
