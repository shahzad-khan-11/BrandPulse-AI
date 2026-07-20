import express from 'express';
import { handleAssistantQuery } from '../controllers/assistantController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/chat', handleAssistantQuery);

export default router;
