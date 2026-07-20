import OrganizationRepository from '../repositories/OrganizationRepository.js';

// @desc    Get organization profile
// @route   GET /api/organizations
// @access  Private
export const getOrganizationProfile = async (req, res, next) => {
  try {
    const org = await OrganizationRepository.findById(req.user.organization);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

// @desc    Update billing tier
// @route   PUT /api/organizations/tier
// @access  Private/Admin
export const updateBillingTier = async (req, res, next) => {
  const { billingTier } = req.body;
  
  if (!['free', 'growth', 'enterprise'].includes(billingTier)) {
    return res.status(400).json({ success: false, message: 'Invalid billing tier' });
  }

  try {
    const org = await OrganizationRepository.update(req.user.organization, { billingTier });
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};
