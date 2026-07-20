/**
 * ============================================================
 *  Universal Brand Relevance Engine — newsService.js
 * ============================================================
 *
 *  Zero hardcoded brand names. Zero keyword dictionaries.
 *  Zero alias maps.
 *
 *  Works automatically for every brand, past and future,
 *  by delegating all relevance decisions to Gemini AI.
 *
 *  Pipeline:
 *    1. Fetch articles from NewsAPI using the brand name as the
 *       search query.
 *    2. Filter locally: deduplicate, remove stubs, require the
 *       brand name to appear in title, description, or content.
 *    3. Send every filtered article to Gemini for a confidence
 *       score (0–100).  Gemini RANKS, it does not eliminate.
 *    4. Sort by confidence descending.
 *       — Articles with confidence >= CONFIDENCE_THRESHOLD are
 *         marked isRelevant=true / primarySubject=true (high confidence).
 *       — Articles below the threshold are marked with
 *         confidenceLabel="AI confidence: Low" but are still returned
 *         so the frontend always has something to display.
 *    5. Never return empty when filtered articles exist.
 *       Empty response is only possible when NewsAPI itself
 *       returns zero articles after local filtering.
 *    6. Persist ALL evaluated articles to MongoDB cache so that
 *       cache-hit paths can apply the same ranking logic.
 */

import axios from 'axios';
import logger from '../config/logger.js';
import NewsArticle from '../models/NewsArticle.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiQueue } from '../utils/geminiQueue.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const NEWS_API_BASE_URL = process.env.NEWS_API_BASE_URL || 'https://newsapi.org/v2';
const TIMEOUT_MS = 12000;
const MAX_RETRIES = 3;

/**
 * Gemini confidence threshold.
 * Articles AT OR ABOVE this score are considered high-confidence / primary subject.
 * Articles BELOW this score are still returned but labelled "AI confidence: Low".
 */
const CONFIDENCE_THRESHOLD = 90;

/** Maximum articles to evaluate with Gemini in one fetch cycle. */
const GEMINI_BATCH_SIZE = 20;

/** Cache TTL — 10 minutes. */
const CACHE_TTL_MS = 10 * 60 * 1000;

// ─── Local filter ─────────────────────────────────────────────────────────────

/**
 * Light local pre-filter before sending to Gemini.
 * Removes deleted stubs, very short articles, and duplicates.
 * Requires the brand name to appear in title, description, OR content —
 * all three are checked so that articles where the brand is only discussed
 * in the body text are not discarded.
 */
const filterArticlesLocally = (brandName, articles) => {
  const seenTitles = new Set();
  const filtered = [];
  const brandLower = brandName.toLowerCase();

  for (const art of articles) {
    const title = (art.title || '').trim();
    const desc = (art.description || '').trim();
    const content = (art.content || '').trim();

    // 1. Skip if title is missing or too short
    if (title.length < 15) continue;

    // 2. Skip if both description and content are too short (stub articles)
    if (desc.length < 20 && content.length < 20) continue;

    // 3. Skip deleted / removed placeholder articles
    if (
      title.toLowerCase().includes('[removed]') ||
      desc.toLowerCase().includes('[removed]')
    ) continue;

    // 4. Skip duplicate titles (case-insensitive, normalised)
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenTitles.has(normalizedTitle)) continue;
    seenTitles.add(normalizedTitle);

    // 5. Brand presence check — title, description, OR content must mention the brand.
    //    Checking all three prevents over-filtering for brands like "Instagram"
    //    where the brand name may only appear in the article body.
    const hasBrandWord =
      title.toLowerCase().includes(brandLower) ||
      desc.toLowerCase().includes(brandLower) ||
      content.toLowerCase().includes(brandLower);
    if (!hasBrandWord) continue;

    filtered.push(art);
  }

  return filtered;
};

// ─── Gemini client (lazy singleton) ─────────────────────────────────────────
let _genAI = null;
const getGenAIClient = () => {
  if (!_genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');
    _genAI = new GoogleGenerativeAI(apiKey);
  }
  return _genAI;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetches a URL with automatic exponential-backoff retries.
 */
const fetchWithRetry = async (url, params, attempt = 1) => {
  try {
    const response = await axios.get(url, { params, timeout: TIMEOUT_MS });
    return response.data;
  } catch (err) {
    logger.warn(`[News Service] Fetch attempt ${attempt} failed: ${err.message}`);
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
      return fetchWithRetry(url, params, attempt + 1);
    }
    throw err;
  }
};

// ─── Universal Gemini Relevance Evaluator ────────────────────────────────────

/**
 * Scores a list of NewsAPI articles against a brand name using Gemini AI.
 *
 * IMPORTANT: Gemini RANKS, it does not eliminate.
 * Every article receives a confidence score (0–100).
 * The caller decides what to do with low-confidence articles —
 * this function never returns an empty array when given non-empty input.
 *
 * On Gemini failure the fallback assigns confidence=50 to all articles
 * so that they are still surfaced rather than silently dropped.
 */
const evaluateRelevanceWithGemini = async (brandName, articles) => {
  // Fallback: give every article a mid-range score so they are still surfaced
  const fallbackVerdicts = articles.map((_, i) => ({
    index: i,
    isRelevant: true,
    primarySubject: false,
    confidence: 50,
    reason: 'Gemini evaluation unavailable — using fallback score.',
  }));

  if (!articles || articles.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('[News Service] GEMINI_API_KEY not set — using fallback scores (50) for all articles.');
    return fallbackVerdicts;
  }

  // Build the sequential list of article prompts
  const articleBlocks = articles.map((art, i) => {
    return `--- ARTICLE [${i}] ---
Selected Brand:
${brandName}

Article Title:
${art.title || 'No Headline'}

Article Description:
${art.description || 'No description available.'}

Article Content:
${art.content || 'No content available.'}

Question:
"Is this article primarily about the company/brand itself, or is the brand merely mentioned?"
`;
  }).join('\n\n');

  const prompt = `You are an enterprise Brand Intelligence AI working for the BrandPulse platform.
Your task: For every article, score how relevant it is to the brand "${brandName}" on a scale of 0–100.

SCORING RULES:
1. High confidence (90–100): Article is primarily about the company/brand itself.
   - The headline is about the brand.
   - The article discusses the company's product, business, leadership, features, outage, security, policy, earnings, AI, roadmap, or official announcements.

2. Medium confidence (50–89): Brand is discussed but is not the sole focus.
   - The brand is one of several subjects.
   - The article is industry news that heavily references the brand.

3. Low confidence (0–49): Brand is incidental.
   - "${brandName}" is only the publishing platform (e.g., an athlete posting on Instagram, a celebrity sharing a story).
   - The brand is only mentioned once or in passing, or as part of social media links.
   - The article is about another person, sports, celebrities, politics, or entertainment (unless the company itself is the main topic).

IMPORTANT: You MUST return an evaluation for EVERY article. Never skip an article.
Score every article — do not return an empty evaluations array.

Return JSON only. Format your response exactly as:
{
  "evaluations": [
    {
      "index": 0,
      "isRelevant": true,
      "primarySubject": true,
      "confidence": 95,
      "reason": "${brandName} company is the main subject."
    }
  ]
}

Set isRelevant=true and primarySubject=true for confidence >= 90.
Set isRelevant=true and primarySubject=false for confidence 50–89.
Set isRelevant=false and primarySubject=false for confidence < 50.

Return an evaluation for EVERY article (indices 0 to ${articles.length - 1}).

Here are the articles to evaluate:

${articleBlocks}
`;

  try {
    const client = getGenAIClient();
    const model = client.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for deterministic, strict evaluation
      },
    });

    const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'News Relevance Evaluation' });
    const rawText = result.response.text().trim();

    // Sanitize markdown code blocks if the model wrapped the JSON response
    let jsonText = rawText;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(jsonText);
    if (!parsed || !Array.isArray(parsed.evaluations)) {
      throw new Error('Invalid JSON structure returned by Gemini');
    }

    // Seed result map with fallback scores — ensures every article has a verdict
    const resultMap = new Map();
    fallbackVerdicts.forEach((v) => resultMap.set(v.index, v));

    parsed.evaluations.forEach((ev) => {
      if (typeof ev.index === 'number') {
        const confidence = typeof ev.confidence === 'number' ? Math.round(ev.confidence) : 50;
        resultMap.set(ev.index, {
          index: ev.index,
          isRelevant: ev.isRelevant === true,
          primarySubject: ev.primarySubject === true,
          confidence,
          reason: ev.reason || '',
        });
      }
    });

    return Array.from(resultMap.values());
  } catch (err) {
    logger.warn(`[News Service] Gemini evaluation failed: ${err.message}. Using fallback scores.`);
    return fallbackVerdicts;
  }
};

// ─── Ranking helper ───────────────────────────────────────────────────────────

/**
 * Given the full list of evaluated articles, produce the final display list.
 *
 * Strategy — rank, don't eliminate:
 *   1. Sort all articles by confidence descending.
 *   2. Return high-confidence articles (>= CONFIDENCE_THRESHOLD) first.
 *   3. If none reach the threshold, return ALL filtered articles anyway,
 *      marking each with confidenceLabel = "AI confidence: Low".
 *   4. Never return empty when evaluated articles exist.
 */
const rankArticlesForDisplay = (evaluatedArticles, pageSize) => {
  if (!evaluatedArticles || evaluatedArticles.length === 0) return [];

  // Sort by confidence score descending (highest relevance first)
  const sorted = [...evaluatedArticles].sort((a, b) => b.confidence - a.confidence);

  const highConfidence = sorted.filter(
    (a) => a.isRelevant && a.primarySubject && a.confidence >= CONFIDENCE_THRESHOLD
  );

  logger.info(
    `[News Service] AI passed: ${highConfidence.length}/${sorted.length} articles at confidence >= ${CONFIDENCE_THRESHOLD}`
  );

  if (highConfidence.length > 0) {
    // Happy path: we have high-confidence articles — return them
    return highConfidence.slice(0, pageSize).map((a) => ({
      ...a,
      confidenceLabel: `AI confidence: High (${a.confidence}%)`,
    }));
  }

  // Fallback path: no article cleared the threshold — return all sorted articles
  // marked as low confidence so the frontend always has something to display.
  logger.warn(
    `[News Service] No article reached confidence threshold (${CONFIDENCE_THRESHOLD}). ` +
    `Returning ${Math.min(sorted.length, pageSize)} best-available articles with "AI confidence: Low" label.`
  );

  return sorted.slice(0, pageSize).map((a) => ({
    ...a,
    confidenceLabel: `AI confidence: Low (${a.confidence}%)`,
  }));
};

// ─── Main Fetch Function ─────────────────────────────────────────────────────

/**
 * Fetches news for a brand from NewsAPI, evaluates every article with
 * Gemini AI for brand relevance, and returns all evaluated articles with
 * metadata.
 *
 * No hardcoded brand names, aliases, or keyword maps are used anywhere.
 */
export const fetchNewsForBrand = async (brandName, _page = 1, pageSize = 10) => {
  const newsApiKey = process.env.NEWS_API_KEY;
  if (!newsApiKey || newsApiKey.trim() === '' || newsApiKey === 'PLACEHOLDER' || newsApiKey.startsWith('your_')) {
    throw new Error('NEWS_API_KEY environment variable is missing or invalid. Please configure it in your .env file.');
  }

  // ── Step 1: Fetch from NewsAPI ───────────────────────────────────────────
  const searchQuery = brandName;
  logger.info(`[News Service] NewsAPI query for brand "${brandName}": ${searchQuery}`);

  const fetchCount = Math.min(pageSize * 2, GEMINI_BATCH_SIZE); // Fetch a pool, capped at batch size

  const data = await fetchWithRetry(`${NEWS_API_BASE_URL}/everything`, {
    q: searchQuery,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: fetchCount,
    apiKey: newsApiKey,
  });

  if (data.status !== 'ok') {
    throw new Error(`NewsAPI error: ${data.status} — ${data.message || 'Unknown error'}`);
  }

  const rawArticles = Array.isArray(data.articles) ? data.articles : [];
  logger.info(`[News Service] Raw articles: ${rawArticles.length}`);

  const filteredArticles = filterArticlesLocally(brandName, rawArticles);
  logger.info(`[News Service] Filtered articles: ${filteredArticles.length}`);

  if (filteredArticles.length === 0) {
    logger.info(`[News Service] Returned articles: 0 (no articles passed local brand filter)`);
    return [];
  }

  // ── Step 2: AI Relevance Scoring ──────────────────────────────────────────
  // Gemini scores every article — it does not eliminate any of them.
  const verdicts = await evaluateRelevanceWithGemini(brandName, filteredArticles);
  const now = new Date();

  // Map verdicts back to article records — ALL articles are preserved
  const evaluatedArticles = verdicts.map((v) => {
    const raw = filteredArticles[v.index];
    return {
      title: raw.title || 'No Headline',
      description: raw.description || 'No description available.',
      source: raw.source?.name || 'Unknown',
      image: raw.urlToImage || '',
      publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : now,
      url: raw.url || '#',
      isRelevant: v.isRelevant,
      primarySubject: v.primarySubject,
      confidence: v.confidence,
      aiReason: v.reason,
      analyzedAt: now,
    };
  });

  const aiPassed = evaluatedArticles.filter(
    (a) => a.isRelevant && a.primarySubject && a.confidence >= CONFIDENCE_THRESHOLD
  ).length;

  logger.info(
    `[News Service] AI passed: ${aiPassed}/${evaluatedArticles.length} articles at confidence >= ${CONFIDENCE_THRESHOLD}`
  );

  return evaluatedArticles;
};

// ─── Cache Orchestrator ──────────────────────────────────────────────────────

/**
 * Returns brand-specific news articles. Serves from MongoDB cache if the
 * cache is still within the TTL window; otherwise fetches fresh articles,
 * runs the full AI relevance pipeline, and stores results.
 *
 * Cache is strictly isolated by brand name — switching brands immediately
 * loads a clean set of articles.
 *
 * RANK, DON'T ELIMINATE:
 * The cache and fresh-fetch paths both run through rankArticlesForDisplay()
 * which guarantees a non-empty result whenever filtered articles exist.
 */
export const getCachedOrFreshNews = async (brandName, page = 1, pageSize = 10) => {
  const now = new Date();

  try {
    // ── Check cache validity ───────────────────────────────────────────────
    const lastAnalysis = await NewsArticle.findOne({ brand: brandName }).sort({ analyzedAt: -1 });
    const isCacheValid = lastAnalysis && (now.getTime() - lastAnalysis.analyzedAt.getTime() < CACHE_TTL_MS);

    if (isCacheValid) {
      // Fetch ALL evaluated articles for this brand (not just high-confidence ones)
      // so that the ranking helper can apply fallback logic when nothing cleared the threshold.
      const cachedAll = await NewsArticle.find({ brand: brandName })
        .sort({ confidence: -1, publishedAt: -1 })
        .lean();

      logger.info(`[News Service] Raw articles: (from cache)`);
      logger.info(`[News Service] Filtered articles: (from cache)`);
      logger.info(`[News Service] Cached article count: ${cachedAll.length}`);

      // Exclude sentinel documents from ranking
      const cachedEvaluated = cachedAll.filter((doc) => doc.title !== 'SENTINEL_NO_NEWS');

      if (cachedEvaluated.length > 0) {
        const aiPassed = cachedEvaluated.filter(
          (a) => a.isRelevant && a.primarySubject && a.confidence >= CONFIDENCE_THRESHOLD
        ).length;
        logger.info(`[News Service] AI passed: ${aiPassed}/${cachedEvaluated.length} cached articles at confidence >= ${CONFIDENCE_THRESHOLD}`);

        const ranked = rankArticlesForDisplay(cachedEvaluated, pageSize);
        const start = (page - 1) * pageSize;
        const paginated = ranked.slice(start, start + pageSize);

        logger.info(`[News Service] Cache HIT: serving ${paginated.length} ranked articles for brand "${brandName}"`);
        logger.info(`[News Service] Returned articles: ${paginated.length}`);
        return paginated.map(toResponseShape);
      } else {
        // Cache contains only a sentinel or is truly empty — bypass and fetch fresh
        logger.info(`[News Service] Cache contained 0 valid articles. Bypassing cache to fetch fresh news for brand "${brandName}"`);
        // Fall through to cache-miss pipeline below
      }
    }

    // ── Cache MISS: run full pipeline ──────────────────────────────────────
    logger.info(`[News Service] Cache MISS: Running fresh AI relevance pipeline for brand "${brandName}"`);
    const evaluated = await fetchNewsForBrand(brandName, 1, pageSize);

    // Clear old articles for this brand before saving fresh results
    await NewsArticle.deleteMany({ brand: brandName });

    if (evaluated.length > 0) {
      // Persist ALL evaluated articles (including low-confidence ones)
      // so future cache-hit paths can still rank and surface them.
      const docs = evaluated.map((art) => ({
        brand: brandName,
        title: art.title,
        description: art.description,
        source: art.source,
        url: art.url,
        image: art.image,
        publishedAt: art.publishedAt,
        language: 'en',
        isRelevant: art.isRelevant,
        primarySubject: art.primarySubject,
        confidence: art.confidence,
        aiReason: art.aiReason,
        analyzedAt: art.analyzedAt || now,
        createdAt: now,
      }));

      await NewsArticle.insertMany(docs);
      logger.info(`[News Service] Cached article count (saved to db): ${docs.length}`);
    } else {
      // NewsAPI returned 0 articles after local filter. Insert a sentinel to cache the empty result.
      logger.info(`[News Service] NewsAPI returned 0 articles. Inserting sentinel to cache empty result for brand "${brandName}"`);
      await NewsArticle.create({
        brand: brandName,
        title: 'SENTINEL_NO_NEWS',
        description: 'Sentinel to cache empty NewsAPI results.',
        source: 'System',
        url: 'http://sentinel',
        publishedAt: now,
        isRelevant: false,
        primarySubject: false,
        confidence: 0,
        aiReason: 'No articles returned by NewsAPI.',
        analyzedAt: now,
        createdAt: now,
      });
    }

    // ── Rank and paginate fresh results ───────────────────────────────────
    // rankArticlesForDisplay guarantees a non-empty result whenever evaluated is non-empty.
    const ranked = rankArticlesForDisplay(evaluated, pageSize);
    const start = (page - 1) * pageSize;
    const paginatedFresh = ranked.slice(start, start + pageSize);

    logger.info(`[News Service] Returned articles: ${paginatedFresh.length}`);
    return paginatedFresh;
  } catch (err) {
    logger.error(`[News Service] getCachedOrFreshNews error for "${brandName}": ${err.message}`);

    // Stale-cache safety net — return any stored articles rather than crashing
    const stale = await NewsArticle.find({
      brand: brandName,
      title: { $ne: 'SENTINEL_NO_NEWS' },
    })
      .sort({ confidence: -1, publishedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    if (stale.length > 0) {
      logger.warn(`[News Service] Returning stale cache (${stale.length} articles) for brand "${brandName}"`);
      return stale.map(toResponseShape);
    }

    // Nothing at all — caller must handle showing the empty state
    throw err;
  }
};

// ─── Shape helper ─────────────────────────────────────────────────────────────

/**
 * Maps a MongoDB document (or in-memory evaluated article) to the API response shape.
 * Preserves confidenceLabel when present so the frontend can display it.
 */
const toResponseShape = (doc) => ({
  title: doc.title,
  description: doc.description,
  source: doc.source,
  image: doc.image,
  publishedAt: doc.publishedAt,
  url: doc.url,
  isRelevant: doc.isRelevant,
  primarySubject: doc.primarySubject,
  confidence: doc.confidence,
  confidenceLabel: doc.confidenceLabel || null,
  analyzedAt: doc.analyzedAt,
});
