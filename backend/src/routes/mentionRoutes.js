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
  generateReplies,
  selectReply,
  saveReply,
  approveReply,
  dispatchReply,
  getMentionResponses,
  sendMentionReply,
  seedDemoMentions,
  createReportCase,
  createRestrictionRecord,
  getReportCases,
  clearDemoData
} from '../controllers/mentionController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createMentionSchema } from '../validators/mentionValidator.js';

const router = express.Router();

router.use(protect); // All mention routes require authentication

router.get('/cities', getCities);
router.get('/priority', getPriorityMentions);
router.get('/spam-fake', getSpamFakeMentions);
router.get('/reports/cases', getReportCases);

router.post('/:id/classification', updateClassification);
router.post('/:id/report', createReportCase);
router.post('/:id/restrict', createRestrictionRecord);

// Reply Suite Endpoints
router.post('/:id/generate-replies', generateReplies);
router.post('/:id/generate-reply', generateMentionReply);
router.post('/:id/select-reply', selectReply);
router.post('/:id/save-reply', saveReply);
router.post('/:id/approve-reply', approveReply);
router.post('/:id/dispatch', dispatchReply);
router.post('/:id/send-reply', sendMentionReply);
router.get('/:id/responses', getMentionResponses);

router.route('/brand/:brandId')
  .get(getMentions)
  .post(validate(createMentionSchema), createMention);

router.post('/brand/:brandId/sync', syncBrandMentions);
router.post('/brand/:brandId/seed-demo', seedDemoMentions);
router.delete('/brand/:brandId/demo-data', clearDemoData);
router.get('/brand/:brandId/metrics', getSentimentMetrics);

export default router;


