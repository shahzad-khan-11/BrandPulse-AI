import express from 'express';
import { getTeamUsers, updateProfile, changePassword, deleteUser } from '../controllers/userController.js';
import protect from '../middleware/auth.js';
import checkPermission from '../middleware/permission.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/', checkPermission('users:read'), getTeamUsers);
router.put('/profile', upload.single('profileImage'), updateProfile);
router.put('/change-password', changePassword);
router.delete('/:id', checkPermission('users:delete'), deleteUser);

export default router;
