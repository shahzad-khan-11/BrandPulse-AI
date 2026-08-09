import express from 'express';
import { 
  getMentions, 
  createMention, 
  getSentimentMetrics, 
  syncBrandMentions, 
  getCities,
  getPriorityMentions,
  getSpamFakeMentions,
  updateClassification,
  generateMentionReply,
  sendMentionReply,
  seedDemoMentions
} from '../controllers/mentionController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createMentionSchema } from '../validators/mentionValidator.js';

const router = express.Router();

router.use(protect); // All mention routes require authentication

router.get('/cities', getCities);
router.get('/priority', getPriorityMentions);
router.get('/spam-fake', getSpamFakeMentions);

router.post('/:id/classification', updateClassification);
router.post('/:id/generate-reply', generateMentionReply);
router.post('/:id/send-reply', sendMentionReply);

router.route('/brand/:brandId')
  .get(getMentions)
  .post(validate(createMentionSchema), createMention);

router.post('/brand/:brandId/sync', syncBrandMentions);
router.post('/brand/:brandId/seed-demo', seedDemoMentions);
router.get('/brand/:brandId/metrics', getSentimentMetrics);

export default router;
