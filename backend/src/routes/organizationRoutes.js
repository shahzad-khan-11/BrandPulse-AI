import express from 'express';
import { getOrganizationProfile, updateBillingTier } from '../controllers/organizationController.js';
import protect from '../middleware/auth.js';
import checkPermission from '../middleware/permission.js';

const router = express.Router();

router.use(protect);

router.get('/', getOrganizationProfile);
router.put('/tier', checkPermission('org:billing:update'), updateBillingTier); // Only admins or users with permission

export default router;
