import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
import Brand from '../models/Brand.js';
import BrandMention from '../models/BrandMention.js';
import ExecutiveReport from '../models/ExecutiveReport.js';

// GET /api/settings
export const getSettings = async (req, res, next) => {
  try {
    let settings = await UserSettings.findOne({ user: req.user._id });
    if (!settings) {
      settings = await UserSettings.create({ user: req.user._id });
    }

    const user = await User.findById(req.user._id);
    const now = new Date();
    const lastLoginDays = user.lastLogin
      ? Math.floor((now - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24))
      : null;
    const passwordDays = Math.floor((now - new Date(user.updatedAt)) / (1000 * 60 * 60 * 24));

    const security = {
      activeSessions: 1,
      twoFactorEnabled: false,
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      lastLoginDays,
      passwordLastChangedDays: passwordDays,
    };

    res.json({ success: true, data: { settings, security } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/settings
export const updateSettings = async (req, res, next) => {
  try {
    const allowedFields = [
      'workspaceName', 'timezone', 'language', 'region',
      'aiAssistantEnabled', 'autoAiInsights', 'autoExecReports', 'aiResponseLanguage',
      'emailNotifications', 'riskAlertNotifications', 'weeklySummary', 'desktopNotifications',
      'theme', 'compactLayout', 'sidebarCollapsed',
      'defaultPdfFormat', 'includeCharts', 'includeExecutiveSummary',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const settings = await UserSettings.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/settings/delete-workspace
export const deleteWorkspace = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const orgId = req.user.organization;
    await Brand.deleteMany({ organization: orgId });
    await BrandMention.deleteMany({ organization: orgId });
    await ExecutiveReport.deleteMany({ organization: orgId });

    res.json({ success: true, message: 'Workspace data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/settings/delete-account
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    await UserSettings.deleteOne({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};
