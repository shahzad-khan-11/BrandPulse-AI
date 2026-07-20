import express from 'express';
import { getReports, createReport, deleteReport } from '../controllers/reportController.js';
import protect from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.route('/brand/:brandId')
  .get(getReports)
  .post(upload.single('file'), createReport); // Maps Multer attachment single upload

router.delete('/:id', deleteReport);

export default router;
