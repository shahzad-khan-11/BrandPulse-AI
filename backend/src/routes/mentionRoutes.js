import express from 'express';
import { getMentions, createMention, getSentimentMetrics, syncBrandMentions, getCities } from '../controllers/mentionController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createMentionSchema } from '../validators/mentionValidator.js';

const router = express.Router();

router.use(protect); // All mention routes require authentication

router.get('/cities', getCities);

router.route('/brand/:brandId')
  .get(getMentions)
  .post(validate(createMentionSchema), createMention);

router.post('/brand/:brandId/sync', syncBrandMentions);
router.get('/brand/:brandId/metrics', getSentimentMetrics);

export default router;
