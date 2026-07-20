import mongoose from 'mongoose';

const newsAnalysisSchema = new mongoose.Schema({
  brand: { type: String, required: true, unique: true, index: true },
  overallSentiment: { type: String, default: 'neutral' },
  positiveHighlights: [{ type: String }],
  negativeHighlights: [{ type: String }],
  reputationScore: { type: Number, default: 50 },
  trendingTopics: [{ type: String }],
  businessRisks: [{ type: String }],
  executiveSummary: { type: String, default: '' },
  actionableRecommendations: [{ type: String }],
  confidenceScore: { type: Number, default: 0.0 },
  articleSentiments: [{
    title: { type: String },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Check if model is already defined to prevent OverwriteModelError
const NewsAnalysis = mongoose.models.NewsAnalysis || mongoose.model('NewsAnalysis', newsAnalysisSchema);
export default NewsAnalysis;
