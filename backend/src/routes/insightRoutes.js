import express from 'express';
import { getBrandInsights } from '../controllers/insightController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/brand/:brandId', getBrandInsights);

export default router;
