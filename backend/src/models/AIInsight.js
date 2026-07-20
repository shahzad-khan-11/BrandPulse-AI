import mongoose from 'mongoose';

const aiInsightSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    brandHealthScore: {
      type: Number,
      default: 70,
    },
    brandHealthSummary: {
      type: String,
      default: '',
    },
    customerSatisfactionTrend: {
      type: String,
      default: '',
    },
    positiveVsNegativeTrend: {
      type: String,
      default: '',
    },
    emergingIssues: {
      type: [String],
      default: [],
    },
    mostDiscussedTopics: {
      type: [String],
      default: [],
    },
    mostAffectedLocations: {
      type: [String],
      default: [],
    },
    topComplaintCategories: {
      type: [String],
      default: [],
    },
    reputationRiskSummary: {
      type: String,
      default: '',
    },
    recommendations: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        priority: { 
          type: String, 
          enum: ['high', 'medium', 'low'], 
          default: 'medium' 
        },
        reason: { type: String, required: true },
        suggestedAction: { type: String, required: true }
      }
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

const AIInsight = mongoose.model('AIInsight', aiInsightSchema);
export default AIInsight;
