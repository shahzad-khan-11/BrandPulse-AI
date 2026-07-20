import express from 'express';
import { getDatabaseHealth, triggerBackup } from '../controllers/adminController.js';
import protect from '../middleware/auth.js';
import checkPermission from '../middleware/permission.js';

const router = express.Router();

router.use(protect);

router.get('/health', checkPermission('admin:access'), getDatabaseHealth);
router.post('/backup', checkPermission('admin:access'), triggerBackup);

export default router;
