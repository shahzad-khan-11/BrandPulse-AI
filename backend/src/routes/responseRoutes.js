import express from 'express';
import { getResponses, updateResponse, retryResponse } from '../controllers/mentionController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getResponses);
router.patch('/:id', updateResponse);
router.post('/:id/retry', retryResponse);

export default router;
