import express from 'express';
import { 
  generateExecutiveReport, 
  getExecutiveReports, 
  getExecutiveReportDetails, 
  deleteExecutiveReport, 
  exportExecutiveReport, 
  regenerateExecutiveReport 
} from '../controllers/executiveReportController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/brand/:brandId/generate', generateExecutiveReport);
router.get('/brand/:brandId', getExecutiveReports);
router.get('/:id', getExecutiveReportDetails);
router.delete('/:id', deleteExecutiveReport);
router.get('/:id/export', exportExecutiveReport);
router.post('/:id/regenerate', regenerateExecutiveReport);

export default router;
