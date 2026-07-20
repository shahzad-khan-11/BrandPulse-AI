import express from 'express';
import { getSettings, updateSettings, deleteWorkspace, deleteAccount } from '../controllers/settingsController.js';
import protect from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettings);
router.delete('/delete-workspace', deleteWorkspace);
router.delete('/delete-account', deleteAccount);

export default router;
