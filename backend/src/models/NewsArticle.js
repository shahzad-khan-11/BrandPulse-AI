import mongoose from 'mongoose';

/**
 * NewsArticle — persists AI-verified, brand-specific news articles.
 *
 * Key fields added for the Universal Brand Relevance Engine:
 *   isRelevant  — true only for articles that passed the Gemini AI gate
 *   confidence  — Gemini's confidence score (0–100) that the article is
 *                 primarily about the brand
 *   aiReason    — Gemini's brief reasoning for the verdict
 *   analyzedAt  — when Gemini evaluated this article (used for cache TTL)
 */
const newsArticleSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    source: { type: String, default: '' },
    url: { type: String, required: true },
    image: { type: String, default: '' },
    publishedAt: { type: Date, required: true },
    language: { type: String, default: 'en' },
    country: { type: String, default: '' },

    // ── AI Relevance Metadata ──────────────────────────────────────────────
    /** Whether Gemini confirmed this article is primarily about the brand. */
    isRelevant: { type: Boolean, default: false, index: true },
    primarySubject: { type: Boolean, default: false, index: true },

    /**
     * Gemini's confidence score (0–100).
     * Only articles with confidence >= 90 are stored and served.
     */
    confidence: { type: Number, default: 0, index: true },

    /** Brief AI reasoning for the relevance verdict. */
    aiReason: { type: String, default: '' },

    /** Timestamp when Gemini evaluated this article. Used for cache TTL. */
    analyzedAt: { type: Date, default: null, index: true },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index: fast cache-hit queries scoped to a brand
newsArticleSchema.index({ brand: 1, isRelevant: 1, analyzedAt: -1 });
newsArticleSchema.index({ brand: 1, confidence: -1, publishedAt: -1 });

// Check if model is already defined to prevent OverwriteModelError
const NewsArticle = mongoose.models.NewsArticle || mongoose.model('NewsArticle', newsArticleSchema);
export default NewsArticle;
