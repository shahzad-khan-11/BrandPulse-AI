import BrandRepository from '../repositories/BrandRepository.js';
import BrandMentionRepository from '../repositories/BrandMentionRepository.js';
import { analyzeRegionalContent } from '../services/aiService.js';
import { analyzeMentionThreats } from '../services/threatService.js';
import { resolveLocationForMention, getCityRegistry } from '../services/locationService.js';
import { dispatchWebhook } from '../services/webhookService.js';
import { calculateBrandInsights } from '../services/insightService.js';
import { pushNotification } from '../services/notificationService.js';
import { sendCriticalThreatAlertEmail } from '../services/emailService.js';
import logger from '../config/logger.js';

// @desc    Get mentions for a brand with filters and pagination
// @route   GET /api/mentions/brand/:brandId
// @access  Private
export const getMentions = async (req, res, next) => {
  const { brandId } = req.params;
  const { source, sentiment, language, search, priority, city, page, limit, sort } = req.query;

  try {
    // Verify brand ownership scope
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const filters = { brand: brandId };

    if (source) filters.source = source;
    if (sentiment) filters.sentiment = sentiment;
    if (language) filters.language = language;
    if (priority) filters.priority = priority;
    if (city) filters['location.city'] = city;
    if (search) {
      filters.content = { $regex: search, $options: 'i' };
    }

    const results = await BrandMentionRepository.paginate(filters, { page, limit, sort });
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually add a mention and analyze with AI
// @route   POST /api/mentions/brand/:brandId
// @access  Private
export const createMention = async (req, res, next) => {
  const { brandId } = req.params;
  const { source, content, author, url } = req.body;

  try {
    // Verify brand ownership scope
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Call Gemini AI analysis
    logger.info(`Analyzing regional sentiment for brand ${brand.name}...`);
    const analysis = await analyzeRegionalContent(content);

    // Call threat analysis service
    logger.info(`Analyzing threat levels & priority rating...`);
    const threatInfo = await analyzeMentionThreats(content, analysis.sentiment);

    // Resolve hyperlocal location
    const locationInfo = resolveLocationForMention(content, analysis.language, source || 'custom', req.body.location);

    const mention = await BrandMentionRepository.create({
      brand: brandId,
      source: source || 'custom',
      content,
      translatedContent: analysis.translatedContent || '',
      author: author || 'Anonymous',
      url,
      publishedAt: new Date(),
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      language: analysis.language,
      confidence: analysis.confidence,
      emotion: analysis.emotion,
      summary: analysis.summary,
      aiAnalysis: analysis.aiAnalysis,
      location: locationInfo,
      sourcePlatform: locationInfo.sourcePlatform,
      priority: threatInfo.priority,
      threatAnalysis: {
        detectedThreats: threatInfo.detectedThreats,
        explanation: threatInfo.explanation
      }
    });

    // Send email alert for Critical priority threat
    if (mention.priority === 'critical') {
      try {
        await sendCriticalThreatAlertEmail(
          req.user.email,
          req.user.name,
          brand.name,
          threatInfo.explanation || 'Critical brand safety threat detected in mention',
          analysis.sentiment,
          analysis.aiAnalysis?.suggestedAction || 'Review immediate crisis plan'
        );
      } catch (emailErr) {
        logger.error(`[MentionController] Critical threat alert email failed for ${req.user.email}: ${emailErr.message}`);
      }
    }

    // Dispatch general mention created event and negative alert webhook to n8n triggers
    if (process.env.N8N_WEBHOOK_URL) {
      dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
        event: 'mention.created',
        timestamp: new Date().toISOString(),
        brandName: brand.name,
        mention: {
          _id: mention._id,
          brand: mention.brand,
          author: mention.author,
          source: mention.source,
          content: mention.content,
        }
      }).catch(err => logger.error('n8n general webhook dispatch error:', err));

      if (mention.sentiment === 'negative') {
        dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
          event: 'mention.alert.negative',
          timestamp: new Date().toISOString(),
          brandName: brand.name,
          data: {
            id: mention._id,
            author: mention.author,
            source: mention.source,
            content: mention.content,
            sentimentScore: mention.sentimentScore,
            emotionalTone: analysis.aiAnalysis.emotionalTone,
            suggestedAction: analysis.aiAnalysis.suggestedAction,
          },
        }).catch(err => logger.error('n8n negative webhook dispatch error:', err));
      }
    }

    res.status(201).json({ success: true, data: mention });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Indian cities list
// @route   GET /api/mentions/cities
// @access  Private
export const getCities = async (req, res, next) => {
  try {
    const registry = getCityRegistry();
    res.json({ success: true, data: registry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated sentiment metrics for dashboard charts
// @route   GET /api/mentions/brand/:brandId/metrics
// @access  Private
export const getSentimentMetrics = async (req, res, next) => {
  const { brandId } = req.params;
  const { city } = req.query;

  try {
    // Verify brand ownership scope
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Get all mentions to calculate city-wise stats
    const allMentions = await BrandMentionRepository.find({ brand: brandId });

    // Filter mentions for the rest of the metrics if a city is specified
    const mentions = city 
      ? allMentions.filter(m => m.location?.city === city) 
      : allMentions;

    // 1. Sentiment Count breakdown
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let totalScore = 0;

    // 2. Mentions by Source
    const sourceCounts = {};

    // 3. Mentions by Language
    const languageCounts = { English: 0, Hindi: 0, Bhojpuri: 0, Maithili: 0, Bengali: 0 };

    // 4. Mentions over time (last 7 days)
    const timeline = {};
    for (let i = 6; i >= 0; i--) {
      const dateStr = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      timeline[dateStr] = { positive: 0, neutral: 0, negative: 0, total: 0 };
    }

    mentions.forEach((mention) => {
      // Counts
      sentimentCounts[mention.sentiment]++;
      totalScore += mention.sentimentScore;

      // Source
      sourceCounts[mention.source] = (sourceCounts[mention.source] || 0) + 1;

      // Language
      const lang = mention.language || 'English';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;

      // Timeline
      const dateStr = new Date(mention.publishedAt).toISOString().split('T')[0];
      if (timeline[dateStr]) {
        timeline[dateStr][mention.sentiment]++;
        timeline[dateStr].total++;
      }
    });

    const averageSentimentScore = mentions.length > 0 ? (totalScore / mentions.length).toFixed(2) : 0;

    // Transform timeline into a sorted array
    const timelineData = Object.keys(timeline).map((date) => ({
      date,
      ...timeline[date],
    }));

    // 5. Generate City-Wise Stats (using allMentions so we see all cities)
    const cityWise = {};
    allMentions.forEach((mention) => {
      const mCity = mention.location?.city || 'Unknown';
      if (!cityWise[mCity]) {
        cityWise[mCity] = {
          city: mCity,
          state: mention.location?.state || 'Unknown',
          region: mention.location?.region || 'Unknown',
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0,
          totalScore: 0,
          alertsCount: 0,
        };
      }
      cityWise[mCity][mention.sentiment]++;
      cityWise[mCity].total++;
      cityWise[mCity].totalScore += mention.sentimentScore || 0;
      if (mention.priority === 'critical' || mention.priority === 'high' || mention.sentiment === 'negative') {
        cityWise[mCity].alertsCount++;
      }
    });

    const cityWiseStats = Object.keys(cityWise).map((cKey) => {
      const stats = cityWise[cKey];
      const avgScore = stats.total > 0 ? stats.totalScore / stats.total : 0;
      const reputationScore = Math.round((avgScore + 1) * 50);
      return {
        city: stats.city,
        state: stats.state,
        region: stats.region,
        sentimentBreakdown: {
          positive: stats.positive,
          neutral: stats.neutral,
          negative: stats.negative,
        },
        averageSentimentScore: Number(avgScore.toFixed(2)),
        reputationScore,
        alertsCount: stats.alertsCount,
        totalMentions: stats.total,
      };
    });

    // 6. Generate Hyperlocal Trending Topics
    const cityTrends = {};
    allMentions.forEach((mention) => {
      const mCity = mention.location?.city || 'Unknown';
      if (mCity === 'Unknown') return;

      if (!cityTrends[mCity]) {
        cityTrends[mCity] = {
          city: mCity,
          keywords: new Set(),
          hashtags: new Set(),
          topics: new Set(),
          issues: new Set(),
        };
      }

      const contentLower = (mention.content || '').toLowerCase();
      // Extract hashtags
      const hashtags = mention.content.match(/#\w+/g) || [];
      hashtags.forEach(tag => cityTrends[mCity].hashtags.add(tag));

      // Extract keywords
      const stopWords = ['about', 'there', 'their', 'would', 'could', 'should', 'brand', brand.name.toLowerCase()];
      const words = contentLower.match(/[a-z]+/gi) || [];
      words.forEach(w => {
        if (w.length > 4 && !stopWords.includes(w)) {
          cityTrends[mCity].keywords.add(w);
        }
      });

      // Extract topics based on themes/summary
      if (mention.summary) {
        cityTrends[mCity].topics.add(mention.summary);
      } else if (mention.aiAnalysis?.keyThemes) {
        mention.aiAnalysis.keyThemes.forEach(theme => cityTrends[mCity].topics.add(theme));
      }

      // Extract issues if negative sentiment
      if (mention.sentiment === 'negative') {
        cityTrends[mCity].issues.add(mention.summary || mention.content);
      }
    });

    const hyperlocalTrends = Object.keys(cityTrends).map((cKey) => {
      const trends = cityTrends[cKey];
      
      // Fallbacks if sets are empty
      if (trends.hashtags.size === 0) {
        trends.hashtags.add(`#${trends.city.replace(/\s+/g, '')}`);
        trends.hashtags.add(`#${brand.name.replace(/\s+/g, '')}${trends.city.replace(/\s+/g, '')}`);
      }
      if (trends.keywords.size === 0) {
        trends.keywords.add('service');
        trends.keywords.add('performance');
        trends.keywords.add('satisfaction');
      }
      if (trends.topics.size === 0) {
        trends.topics.add('Local brand adoption');
        trends.topics.add('Product feedback');
      }
      if (trends.issues.size === 0) {
        trends.issues.add('None detected');
      }

      return {
        city: trends.city,
        keywords: Array.from(trends.keywords).slice(0, 5),
        hashtags: Array.from(trends.hashtags).slice(0, 4),
        topics: Array.from(trends.topics).slice(0, 3),
        issues: Array.from(trends.issues).slice(0, 3),
      };
    });

    res.json({
      success: true,
      data: {
        totalMentions: mentions.length,
        averageSentimentScore: Number(averageSentimentScore),
        sentimentBreakdown: sentimentCounts,
        sourceBreakdown: sourceCounts,
        languageBreakdown: languageCounts,
        timeline: timelineData,
        cityWiseStats,
        hyperlocalTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate brand web monitoring (Scrape & Analyze)
// @route   POST /api/mentions/brand/:brandId/sync
// @access  Private
export const syncBrandMentions = async (req, res, next) => {
  const { brandId } = req.params;

  try {
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Standard list of realistic mock brand mentions
    // Standard list of realistic mock brand mentions with regional Indian language support
    const mockTemplates = [
      {
        source: 'twitter',
        author: '@tech_guru',
        content: `Just got my hands on the new features from ${brand.name}! This is absolutely amazing and makes our workflow 10x faster. Highly recommended.`,
        daysAgo: 0,
      },
      {
        source: 'reddit',
        author: 'u/curious_coder',
        content: `Is anyone else experiencing issues with ${brand.name} today? The system is throwing random errors when loading dashboards. Pretty frustrating.`,
        daysAgo: 1,
      },
      {
        source: 'news',
        author: 'TechCrunch',
        content: `With its recent updates, ${brand.name} continues to position itself as a standard player in the market. Developers are excited, though pricing plans remain a concern for smaller startups.`,
        daysAgo: 2,
      },
      {
        source: 'local_news',
        author: 'Patna Herald',
        content: `स्थानीय समाचार: ${brand.name} ने पटना में अपना नया ऑपरेशन सेंटर खोल दिया है। सेवा बहुत बढ़िया है।`,
        daysAgo: 2,
      },
      {
        source: 'rss',
        author: 'TechRSS Feed',
        content: `RSS Feed: Discover how ${brand.name} utilizes hyperlocal source monitoring to target Tier 2 and Tier 3 Indian markets.`,
        daysAgo: 3,
      },
      {
        source: 'regional_news',
        author: 'Pune Express',
        content: `प्रादेशिक बातमी: ${brand.name} पुणेकरांसाठी खूप चांगले आणि सोयीचे ठरत आहे. खूप छान आहे.`,
        daysAgo: 3,
      },
      {
        source: 'regional_blogs',
        author: 'BanglaBlog Tech',
        content: `ব্লগ: ${brand.name} এর সার্ভিসটা খুব ভালো, আমি এটা ব্যবহার করে অত্যন্ত আনন্দিত।`,
        daysAgo: 4,
      },
      {
        source: 'google_reviews',
        author: 'Ravi Kumar',
        content: `Google Review: Excellent customer service from ${brand.name}! Highly recommended.`,
        daysAgo: 4,
      },
      {
        source: 'youtube',
        author: 'Reviewer Rohit',
        content: `YouTube: Explaining the new dashboard dashboard features of ${brand.name}. Excellent performance.`,
        daysAgo: 5,
      },
      {
        source: 'x',
        author: '@kerala_tech',
        content: `X: Excited to announce ${brand.name} is now monitoring Malayalam customer feedback. Great product.`,
        daysAgo: 5,
      },
    ];

    const savedMentions = [];

    // Analyze and save each template
    for (const template of mockTemplates) {
      // Perform AI Analysis
      const analysis = await analyzeRegionalContent(template.content);

      // Call threat analysis service
      const threatInfo = await analyzeMentionThreats(template.content, analysis.sentiment);

      // Resolve hyperlocal location
      const locationInfo = resolveLocationForMention(template.content, analysis.language, template.source);

      const publishedAt = new Date();
      publishedAt.setDate(publishedAt.getDate() - template.daysAgo);

      const mention = await BrandMentionRepository.create({
        brand: brand._id,
        source: template.source,
        content: template.content,
        translatedContent: analysis.translatedContent || '',
        author: template.author,
        url: `https://example.com/mention/${Math.floor(Math.random() * 100000)}`,
        publishedAt,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        language: analysis.language,
        confidence: analysis.confidence,
        emotion: analysis.emotion,
        summary: analysis.summary,
        aiAnalysis: analysis.aiAnalysis,
        location: locationInfo,
        sourcePlatform: locationInfo.sourcePlatform,
        priority: threatInfo.priority,
        threatAnalysis: {
          detectedThreats: threatInfo.detectedThreats,
          explanation: threatInfo.explanation
        }
      });

      savedMentions.push(mention);

      // Dispatch webhook events to n8n triggers
      if (process.env.N8N_WEBHOOK_URL) {
        dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
          event: 'mention.created',
          timestamp: new Date().toISOString(),
          brandName: brand.name,
          mention: {
            _id: mention._id,
            brand: mention.brand,
            author: mention.author,
            source: mention.source,
            content: mention.content,
          }
        }).catch(err => logger.error('n8n general webhook dispatch error:', err));

        if (mention.sentiment === 'negative') {
          dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
            event: 'mention.alert.negative',
            timestamp: new Date().toISOString(),
            brandName: brand.name,
            data: {
              id: mention._id,
              author: mention.author,
              source: mention.source,
              content: mention.content,
              sentimentScore: mention.sentimentScore,
              emotionalTone: analysis.aiAnalysis.emotionalTone,
              suggestedAction: analysis.aiAnalysis.suggestedAction,
            },
          }).catch(err => logger.error('n8n negative webhook dispatch error:', err));
        }
      }
    }

    // Recalculate and update AI Insights in the background/inline
    try {
      const allMentions = await BrandMentionRepository.find({ brand: brandId, isDeleted: false });
      await calculateBrandInsights(brandId, allMentions, true);
      logger.info(`[Sync Mentions] Generated fresh AI insights for brand ${brand.name}`);
    } catch (insightsErr) {
      logger.error(`[Sync Mentions] Failed to recalculate AI insights: ${insightsErr.message}`);
    }

    // Generate dynamic notifications for this sync event
    try {
      if (savedMentions.length > 0) {
        await pushNotification({
          userId: req.user._id,
          organizationId: req.user.organization,
          brandId: brand._id,
          title: 'Sync Mentions Completed',
          message: `Successfully synced and analyzed ${savedMentions.length} new mentions for ${brand.name}.`,
          category: 'monitoring',
          priority: 'INFO',
          metadata: { brandName: brand.name }
        });

        for (const m of savedMentions) {
          const isHighRisk = m.priority === 'critical' || m.priority === 'high' || m.sentiment === 'negative';
          if (isHighRisk) {
            await pushNotification({
              userId: req.user._id,
              organizationId: req.user.organization,
              brandId: brand._id,
              title: m.threatAnalysis?.detectedThreats?.length > 0 ? '🚨 Identity Threat Detected' : '🚨 High Risk Mention',
              message: `A sudden increase in negative sentiment has been detected.`,
              category: m.threatAnalysis?.detectedThreats?.length > 0 ? 'threat' : 'sentiment',
              priority: 'HIGH',
              actionUrl: `/mentions`,
              metadata: {
                brandName: brand.name,
                city: m.location?.city || brand.city,
                author: m.author,
                sentiment: m.sentiment
              }
            });
          }
        }
      }
    } catch (notifErr) {
      logger.error(`[Sync Mentions] Notification generation failed: ${notifErr.message}`);
    }

    res.json({
      success: true,
      message: `Successfully synced and analyzed ${savedMentions.length} mentions for ${brand.name}`,
      data: savedMentions,
    });
  } catch (error) {
    next(error);
  }
};
