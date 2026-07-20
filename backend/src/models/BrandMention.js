import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const brandMentionSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['twitter', 'reddit', 'news', 'web', 'custom', 'local_news', 'rss', 'regional_news', 'regional_blogs', 'google_reviews', 'youtube', 'x'],
      default: 'web',
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    translatedContent: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: 'Anonymous',
    },
    url: {
      type: String,
      trim: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sentiment: {
      type: String,
      required: true,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
      index: true,
    },
    sentimentScore: {
      type: Number,
      required: true,
      default: 0.0,
      index: true,
    },
    language: {
      type: String,
      default: 'English',
      index: true,
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
    emotion: {
      type: String,
      default: 'neutral',
    },
    summary: {
      type: String,
      default: '',
    },
    aiAnalysis: {
      keyThemes: [String],
      emotionalTone: String,
      suggestedAction: String,
      explanation: String,
      suggestedReplies: {
        hindiReply: { type: String, default: '' },
        englishReply: { type: String, default: '' },
        friendlyReply: { type: String, default: '' },
        professionalReply: { type: String, default: '' }
      }
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'low',
      index: true,
    },
    threatAnalysis: {
      detectedThreats: [String],
      explanation: String,
    },
    location: {
      city: {
        type: String,
        default: '',
      },
      state: {
        type: String,
        default: '',
      },
      region: {
        type: String,
        default: '',
      },
      tier: {
        type: Number,
        default: null,
      },
      country: {
        type: String,
        default: '',
      },
      latitude: {
        type: Number,
        default: 0.0,
      },
      longitude: {
        type: Number,
        default: 0.0,
      },
      sourcePlatform: {
        type: String,
        default: '',
      },
    },
    sourcePlatform: {
      type: String,
      default: '',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

brandMentionSchema.plugin(softDeletePlugin);

// Compound index for fast timeline queries
brandMentionSchema.index({ brand: 1, publishedAt: -1 });
brandMentionSchema.index({ brand: 1, sentiment: 1 });

const BrandMention = mongoose.model('BrandMention', brandMentionSchema);
export default BrandMention;
