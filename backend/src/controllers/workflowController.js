import WorkflowLogRepository from '../repositories/WorkflowLogRepository.js';

// @desc    Get execution logs for crawler sync runs
// @route   GET /api/workflows/logs
// @access  Private/Admin
export const getWorkflowLogs = async (req, res, next) => {
  const { page, limit, status } = req.query;
  try {
    const filters = {};
    if (status) {
      filters.status = status;
    }
    const results = await WorkflowLogRepository.paginate(filters, { page, limit });
    res.json({ success: true, ...results });
  } catch (error) {
    next(error);
  }
};
