import { getCachedOrFreshNews } from '../services/newsService.js';
import { analyzeNewsArticles } from '../services/geminiService.js';
import NewsAnalysis from '../models/NewsAnalysis.js';
import NewsArticle from '../models/NewsArticle.js';
import Brand from '../models/Brand.js';
import { pushNotification } from '../services/notificationService.js';
import logger from '../config/logger.js';

/**
 * GET /api/news
 *
 * Returns AI-verified, brand-specific news articles and their sentiment
 * analysis. Uses the Universal Brand Relevance Engine in newsService.js —
 * no hardcoded brand names or keyword maps anywhere in this controller.
 *
 * Query parameters:
 *   brand     {string}   Brand name (required)
 *   page      {number}   Page number (default 1)
 *   pageSize  {number}   Results per page (default 10)
 *   refresh   {string}   Pass "true" to bypass cache and force a fresh fetch
 */
export const getNewsAndAnalysis = async (req, res, next) => {
  try {
    const { brand, page = 1, pageSize = 10, refresh } = req.query;

    if (!brand) {
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 10;
    const forceRefresh = refresh === 'true';

    // ── 1. Force-refresh: wipe this brand's cached articles ───────────────────
    // Called when the user explicitly switches brands or hits "Retry".
    // Clears ONLY this brand's documents — other brands are untouched.
    if (forceRefresh) {
      try {
        const deleted = await NewsArticle.deleteMany({ brand });
        logger.info(
          `[News Controller] Force-refresh: cleared ${deleted.deletedCount} cached articles for brand "${brand}"`
        );
      } catch (delErr) {
        logger.warn(`[News Controller] Could not clear cache for "${brand}": ${delErr.message}`);
      }
    }

    // ── 2. Fetch AI-verified articles (cached or fresh) ───────────────────────
    // The Universal Brand Relevance Engine handles everything:
    //   • NewsAPI fetch
    //   • Gemini per-article relevance evaluation (isRelevant, confidence, reason)
    //   • Confidence threshold filtering (>= 90)
    //   • MongoDB caching scoped strictly to this brand
    let articles = [];
    try {
      articles = await getCachedOrFreshNews(brand, pageNum, pageSizeNum);
    } catch (newsError) {
      logger.error(`[News Controller] News Service error for "${brand}": ${newsError.message}`);
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch news. Please check your NewsAPI Key and try again.',
        error: newsError.message,
      });
    }
    const ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000;
    const now = new Date();
    let analysis = null;

    try {
      // Try cache first
      analysis = await NewsAnalysis.findOne({
        brand,
        createdAt: { $gte: new Date(now.getTime() - ANALYSIS_CACHE_TTL_MS) },
      });

      if (!analysis) {
        logger.info(`[News Controller] Running fresh AI sentiment analysis for brand "${brand}"`);

        // Use top 5 brand-verified articles for analysis context
        const analysisArticles = articles.slice(0, 5);
        const result = await analyzeNewsArticles(brand, analysisArticles);

        analysis = await NewsAnalysis.findOneAndUpdate(
          { brand },
          {
            $set: {
              overallSentiment: result.overallSentiment,
              positiveHighlights: result.positiveHighlights,
              negativeHighlights: result.negativeHighlights,
              reputationScore: result.reputationScore,
              trendingTopics: result.trendingTopics,
              businessRisks: result.businessRisks,
              executiveSummary: result.executiveSummary,
              actionableRecommendations: result.actionableRecommendations,
              confidenceScore: result.confidenceScore,
              articleSentiments: result.articleSentiments,
              createdAt: now,
            },
          },
          { new: true, upsert: true }
        );

        // ── Live notifications ──────────────────────────────────────────────
        if (req.user?._id) {
          const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const brandDoc = await Brand.findOne({
            name: { $regex: new RegExp('^' + escapedBrand + '$', 'i') },
          }).lean();

          const brandDocId = brandDoc?._id ?? null;
          const organizationId = brandDoc?.organization ?? req.user?.organization ?? null;
          const userId = req.user._id;

          if (result.overallSentiment === 'negative') {
            await pushNotification({
              userId, organizationId, brandId: brandDocId,
              title: 'Critical Sentiment Spike',
              message: `High risk news spike detected for ${brand}. Reputation score: ${result.reputationScore}.`,
              category: 'threat', priority: 'HIGH', icon: 'ShieldAlert',
              actionUrl: `/dashboard?brand=${brand}`,
              metadata: { brandName: brand, riskLevel: 'CRITICAL', reputationScore: result.reputationScore },
            });
          }

          if (result.reputationScore >= 75) {
            await pushNotification({
              userId, organizationId, brandId: brandDocId,
              title: 'Brand Reputation Improving',
              message: `Positive news sentiment boosted ${brand}'s reputation score to ${result.reputationScore}.`,
              category: 'sentiment', priority: 'MEDIUM', icon: 'TrendingUp',
              actionUrl: `/dashboard?brand=${brand}`,
              metadata: { brandName: brand, reputationScore: result.reputationScore },
            });
          }

          if (result.trendingTopics?.length > 0) {
            await pushNotification({
              userId, organizationId, brandId: brandDocId,
              title: 'New Trending Topic',
              message: `Trending topics for ${brand}: #${result.trendingTopics.slice(0, 2).join(', #')}`,
              category: 'ai', priority: 'INFO', icon: 'Sparkles',
              actionUrl: `/dashboard?brand=${brand}`,
              metadata: { brandName: brand, trends: result.trendingTopics },
            });
          }

          if (result.businessRisks?.length > 0) {
            await pushNotification({
              userId, organizationId, brandId: brandDocId,
              title: 'Business Risk Assessment',
              message: `New risk detected for ${brand}: ${result.businessRisks[0]}`,
              category: 'monitoring', priority: 'MEDIUM', icon: 'AlertTriangle',
              actionUrl: `/dashboard?brand=${brand}`,
              metadata: { brandName: brand, risks: result.businessRisks },
            });
          }
        }
      } else {
        logger.info(`[News Controller] Cache HIT: Using cached AI analysis for brand "${brand}"`);
      }
    } catch (aiError) {
      logger.error(`[News Controller] AI Analysis error for "${brand}": ${aiError.message}`);
      // Degrade gracefully — serve articles without analysis rather than failing
      analysis = {
        brand,
        overallSentiment: 'neutral',
        positiveHighlights: ['Analysis temporarily unavailable.'],
        negativeHighlights: ['Analysis temporarily unavailable.'],
        reputationScore: 50,
        trendingTopics: [],
        businessRisks: [],
        executiveSummary: 'AI News Analysis is temporarily unavailable. Please try again later.',
        actionableRecommendations: [],
        confidenceScore: 0.0,
        articleSentiments: [],
      };
    }

    // ── 4. Merge per-article sentiment labels from analysis ───────────────────
    const sentimentMap = {};
    if (analysis && Array.isArray(analysis.articleSentiments)) {
      analysis.articleSentiments.forEach(({ title, sentiment }) => {
        if (title) sentimentMap[title.toLowerCase().trim()] = sentiment;
      });
    }

    const articlesWithSentiment = articles.map((art) => ({
      ...art,
      sentiment: sentimentMap[art.title.toLowerCase().trim()] || 'neutral',
    }));

    return res.json({
      success: true,
      data: {
        articles: articlesWithSentiment,
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
};
