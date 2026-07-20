import express from 'express';
import { 
  getNotifications, 
  readAllNotifications, 
  readSingleNotification, 
  deleteNotification, 
  deleteAllNotifications 
} from '../controllers/notificationController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/read', readAllNotifications);
router.put('/:id/read', readSingleNotification);
router.delete('/:id', deleteNotification);
router.delete('/', deleteAllNotifications);

export default router;
