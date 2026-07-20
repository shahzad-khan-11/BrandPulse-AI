import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const executiveReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    filters: {
      startDate: Date,
      endDate: Date,
      language: String,
      sentiment: String,
      priority: String,
      source: String,
      country: String,
      state: String,
      city: String,
    },
    stats: {
      totalMentions: { type: Number, default: 0 },
      brandHealthScore: { type: Number, default: 70 },
      sentimentDistribution: {
        positive: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
        negative: { type: Number, default: 0 }
      },
      threatDistribution: {
        critical: { type: Number, default: 0 },
        high: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        low: { type: Number, default: 0 }
      },
      locationDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
      languageDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
      sourceDistribution: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    aiSummary: {
      brandHealthSummary: { type: String, default: '' },
      sentimentOverview: { type: String, default: '' },
      threatSummary: { type: String, default: '' },
      reputationRisk: { type: String, default: '' },
      topPositiveTopics: { type: [String], default: [] },
      topNegativeTopics: { type: [String], default: [] },
      mostActiveLocations: { type: [String], default: [] },
      languageDistributionText: { type: String, default: '' },
      sourceDistributionText: { type: String, default: '' },
      recommendations: [
        {
          title: String,
          description: String,
          priority: String,
          reason: String,
          suggestedAction: String
        }
      ]
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isAutomated: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

executiveReportSchema.plugin(softDeletePlugin);

const ExecutiveReport = mongoose.model('ExecutiveReport', executiveReportSchema);
export default ExecutiveReport;
