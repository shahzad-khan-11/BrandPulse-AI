import express from 'express';
import { getNewsAndAnalysis } from '../controllers/newsController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Protect all news routes with authentication
router.get('/', protect, getNewsAndAnalysis);

export default router;
