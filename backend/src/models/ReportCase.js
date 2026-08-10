import mongoose from 'mongoose';

const reportCaseSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    mention: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandMention',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ['Spam', 'Fake Review', 'Fake News', 'Harassment', 'Misleading Content', 'Other'],
      default: 'Spam',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'SIMULATED'],
      default: 'OPEN',
      index: true,
    },
    mode: {
      type: String,
      enum: ['LIVE', 'DEMO'],
      default: 'LIVE',
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const ReportCase = mongoose.model('ReportCase', reportCaseSchema);
export default ReportCase;
