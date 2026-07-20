import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  // General
  workspaceName: { type: String, default: '' },
  timezone: { type: String, default: 'UTC+05:30 (IST)' },
  language: { type: String, default: 'English (US)' },
  region: { type: String, default: 'India / South Asia' },
  // AI Preferences
  aiAssistantEnabled: { type: Boolean, default: true },
  autoAiInsights: { type: Boolean, default: true },
  autoExecReports: { type: Boolean, default: false },
  aiResponseLanguage: { type: String, default: 'English' },
  // Notifications
  emailNotifications: { type: Boolean, default: true },
  riskAlertNotifications: { type: Boolean, default: true },
  weeklySummary: { type: Boolean, default: false },
  desktopNotifications: { type: Boolean, default: false },
  // Appearance
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  compactLayout: { type: Boolean, default: false },
  sidebarCollapsed: { type: Boolean, default: false },
  // Exports
  defaultPdfFormat: { type: Boolean, default: true },
  includeCharts: { type: Boolean, default: true },
  includeExecutiveSummary: { type: Boolean, default: true },
}, { timestamps: true });

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);
export default UserSettings;
