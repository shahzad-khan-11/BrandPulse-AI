import express from 'express';
import { getDailySentimentTimeline } from '../controllers/sentimentController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/brand/:brandId/timeline', getDailySentimentTimeline);

export default router;
