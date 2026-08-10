import BrandRepository from '../repositories/BrandRepository.js';
import BrandMentionRepository from '../repositories/BrandMentionRepository.js';
import { analyzeRegionalContent, analyzeSpamAndPriority, generateAIReply } from '../services/aiService.js';
import { analyzeMentionThreats } from '../services/threatService.js';
import { resolveLocationForMention, getCityRegistry } from '../services/locationService.js';
import { dispatchWebhook } from '../services/webhookService.js';
import { calculateBrandInsights } from '../services/insightService.js';
import { pushNotification } from '../services/notificationService.js';
import { sendCriticalThreatAlertEmail } from '../services/emailService.js';
import BrandResponse from '../models/BrandResponse.js';
import ReportCase from '../models/ReportCase.js';
import RestrictionRecord from '../models/RestrictionRecord.js';
import logger from '../config/logger.js';

// @desc    Get mentions for a brand with filters and pagination
// @route   GET /api/mentions/brand/:brandId
// @access  Private
export const getMentions = async (req, res, next) => {
  const { brandId } = req.params;
    const { source, sentiment, language, search, priority, city, isDemo, dataSource, page, limit, sort } = req.query;

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
      if (isDemo !== undefined && isDemo !== '') filters.isDemo = isDemo === 'true';
      if (dataSource) filters.dataSource = dataSource;
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

    // Call spam/fake detection service
    const spamInfo = await analyzeSpamAndPriority(content, analysis.sentiment);

    // Resolve hyperlocal location
    const locationInfo = resolveLocationForMention(content, analysis.language, source || 'custom', req.body.location);

    // Extract hashtags
    const extractedHashtags = (content.match(/#\w+/g) || []).map(tag => tag.toLowerCase());

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
      priorityReason: threatInfo.explanation || '',
      aiClassification: spamInfo.aiClassification,
      aiConfidence: spamInfo.aiConfidence,
      aiReason: spamInfo.aiReason,
      hashtags: extractedHashtags,
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

// @desc    Seed realistic demo dataset for demo mode
// @route   POST /api/mentions/brand/:brandId/seed-demo
// @access  Private
export const seedDemoMentions = async (req, res, next) => {
  const { brandId } = req.params;

  try {
    const brand = await BrandRepository.findOne({ _id: brandId, organization: req.user.organization });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    const demoSamples = [
      {
        content: `Outstanding product quality and ultra-fast delivery from ${brand.name} in Patna! Absolutely loving the customer experience. #Satisfaction #${brand.name.replace(/\s+/g, '')}`,
        author: 'Aarav Sharma',
        source: 'x',
        sentiment: 'positive',
        sentimentScore: 0.9,
        language: 'English',
        emotion: 'joy',
        priority: 'low',
        priorityReason: 'Positive review with high customer satisfaction score.',
        aiClassification: 'GENUINE',
        aiConfidence: 0.95,
        aiReason: 'Authentic user review with specific location markers.',
        location: { city: 'Patna', state: 'Bihar', country: 'India', sourcePlatform: 'X' },
        hashtags: [`#${brand.name.replace(/\s+/g, '')}`, '#Satisfaction', '#Patna'],
        isDemo: true,
        dataSource: 'demo',
      },
      {
        content: `${brand.name} ka service bilkul khrab hai Patna me, delivery delayed by 4 days without any response! #DeliveryFail #${brand.name.replace(/\s+/g, '')}`,
        author: 'Vikram Singh',
        source: 'twitter',
        sentiment: 'negative',
        sentimentScore: -0.85,
        language: 'Hinglish',
        emotion: 'frustration',
        priority: 'high',
        priorityReason: 'Repeated delivery delay complaints affecting brand reputation in Patna.',
        aiClassification: 'GENUINE',
        aiConfidence: 0.92,
        aiReason: 'Genuine customer complaint expressing dissatisfaction in Hinglish.',
        location: { city: 'Patna', state: 'Bihar', country: 'India', sourcePlatform: 'Twitter' },
        hashtags: [`#${brand.name.replace(/\s+/g, '')}`, '#DeliveryFail', '#Patna'],
        isDemo: true,
        dataSource: 'demo',
      },
      {
        content: `${brand.name} के उत्पाद दिल्ली में बहुत ही घटिया हैं। कस्टमर केयर कोई जवाब नहीं दे रहा है। #DelhiComplaints`,
        author: 'Priya Verma',
        source: 'facebook',
        sentiment: 'negative',
        sentimentScore: -0.95,
        language: 'Hindi',
        emotion: 'anger',
        priority: 'critical',
        priorityReason: 'Critical customer complaint in Delhi requiring immediate brand safety team intervention.',
        aiClassification: 'GENUINE',
        aiConfidence: 0.96,
        aiReason: 'Authentic customer complaint in Devanagari Hindi script.',
        location: { city: 'Delhi', state: 'Delhi', country: 'India', sourcePlatform: 'Facebook' },
        hashtags: ['#DelhiComplaints', `#${brand.name.replace(/\s+/g, '')}`],
        isDemo: true,
        dataSource: 'demo',
      },
      {
        content: `Win $10,000 cash prize now! Click here to claim instant discount coupons for ${brand.name}!! http://bit.ly/spamlink`,
        author: 'PromoBot99',
        source: 'news',
        sentiment: 'neutral',
        sentimentScore: 0.0,
        language: 'English',
        emotion: 'neutral',
        priority: 'low',
        priorityReason: 'Automated promotional clickbait spam.',
        aiClassification: 'SPAM',
        aiConfidence: 0.98,
        aiReason: 'Automated referral spam detected with URL redirect link.',
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', sourcePlatform: 'Web' },
        hashtags: ['#FreeGiveaway', '#Promo'],
        isDemo: true,
        dataSource: 'demo',
      },
      {
        content: `${brand.name} is closing down all operations across India due to bankruptcy according to unverified blog posts! #FakeNews`,
        author: 'ClickbaitExpress',
        source: 'news',
        sentiment: 'negative',
        sentimentScore: -0.9,
        language: 'English',
        emotion: 'fear',
        priority: 'high',
        priorityReason: 'Unverified rumor regarding brand insolvency.',
        aiClassification: 'POTENTIALLY_FAKE',
        aiConfidence: 0.93,
        aiReason: 'Suspicious sensationalized headline unsupported by official company press releases.',
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', sourcePlatform: 'News' },
        hashtags: ['#FakeNews', `#${brand.name.replace(/\s+/g, '')}`],
        isDemo: true,
        dataSource: 'demo',
      },
      {
        content: `${brand.name} expands AI research hub in Bengaluru with $50M investment. Official corporate press release verified.`,
        author: 'TechCrunch India',
        source: 'news',
        sentiment: 'positive',
        sentimentScore: 0.85,
        language: 'English',
        emotion: 'joy',
        priority: 'low',
        priorityReason: 'Verified corporate expansion announcement.',
        aiClassification: 'GENUINE',
        aiConfidence: 0.99,
        aiReason: 'Verified publication source with press release cross-reference.',
        location: { city: 'Bengaluru', state: 'Karnataka', country: 'India', sourcePlatform: 'News' },
        hashtags: ['#TechNews', '#Expansion', `#${brand.name.replace(/\s+/g, '')}`],
        isDemo: true,
        dataSource: 'demo',
      },
      {
        content: `${brand.name} is the worst brand ever! Don't buy anything! ${brand.name} is fake! ${brand.name} scammed me!`,
        author: 'UnknownUser123',
        source: 'google_reviews',
        sentiment: 'negative',
        sentimentScore: -0.9,
        language: 'English',
        emotion: 'anger',
        priority: 'medium',
        priorityReason: 'Coordinated negative review pattern.',
        aiClassification: 'POTENTIALLY_FAKE',
        aiConfidence: 0.91,
        aiReason: 'Repeated keyword stuffing pattern typical of coordinated bot campaigns.',
        location: { city: 'Delhi', state: 'Delhi', country: 'India', sourcePlatform: 'Google Reviews' },
        hashtags: [`#${brand.name.replace(/\s+/g, '')}`],
        isDemo: true,
        dataSource: 'demo',
      },
      {
        content: `Checking out the new store location for ${brand.name} in Bengaluru! Excellent interior design and helpful staff. #Bengaluru #Retail`,
        author: 'Rohan Mehta',
        source: 'instagram',
        sentiment: 'positive',
        sentimentScore: 0.88,
        language: 'English',
        emotion: 'joy',
        priority: 'low',
        priorityReason: 'Positive brand opening mention.',
        aiClassification: 'GENUINE',
        aiConfidence: 0.94,
        aiReason: 'Legitimate store visit review with location photos.',
        location: { city: 'Bengaluru', state: 'Karnataka', country: 'India', sourcePlatform: 'Instagram' },
        hashtags: ['#Bengaluru', '#Retail', `#${brand.name.replace(/\s+/g, '')}`],
        isDemo: true,
        dataSource: 'demo',
      }
    ];

    const createdMentions = [];
    for (const sample of demoSamples) {
      const doc = await BrandMentionRepository.create({
        ...sample,
        brand: brandId,
        publishedAt: new Date(),
        aiAnalysis: {
          keyThemes: ['Product Quality', 'Customer Experience'],
          emotionalTone: sample.emotion,
          suggestedAction: sample.sentiment === 'negative' ? 'Contact customer directly to resolve issue' : 'Acknowledge feedback with thank-you message',
          explanation: sample.aiReason,
          suggestedReplies: {
            hindiReply: `नमस्ते! ${brand.name} के संबंध में आपकी प्रतिक्रिया के लिए धन्यवाद।`,
            englishReply: `Thank you for sharing your feedback regarding ${brand.name}!`,
            friendlyReply: `Thanks so much for the love! We appreciate your support for ${brand.name}!`,
            professionalReply: `Dear customer, thank you for contacting ${brand.name}. Our support team is actively addressing your feedback.`
          }
        }
      });
      createdMentions.push(doc);
    }

    res.status(201).json({
      success: true,
      message: `Seeded ${createdMentions.length} realistic demo mentions for ${brand.name}`,
      data: createdMentions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get priority classified mentions
// @route   GET /api/mentions/priority
// @access  Private
export const getPriorityMentions = async (req, res, next) => {
  const { brandId, priority } = req.query;
  if (!brandId) return res.status(400).json({ success: false, message: 'brandId parameter is required' });

  try {
    const brand = await BrandRepository.findOne({ _id: brandId, organization: req.user.organization });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    const filter = { brand: brandId, isDeleted: false };
    if (priority) {
      filter.priority = priority.toLowerCase();
    }

    const mentions = await BrandMentionRepository.find(filter)
      .populate('brand', 'name')
      .sort({ publishedAt: -1 });

    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    mentions.sort((a, b) => (priorityWeight[b.priority || 'low'] || 1) - (priorityWeight[a.priority || 'low'] || 1));

    res.json({ success: true, count: mentions.length, data: mentions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get spam / potentially fake classified mentions
// @route   GET /api/mentions/spam-fake
// @access  Private
export const getSpamFakeMentions = async (req, res, next) => {
  const { brandId, classification } = req.query;
  if (!brandId) return res.status(400).json({ success: false, message: 'brandId parameter is required' });

  try {
    const brand = await BrandRepository.findOne({ _id: brandId, organization: req.user.organization });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    const filter = { brand: brandId, isDeleted: false };
    if (classification) {
      filter.$or = [
        { aiClassification: classification },
        { userClassification: classification },
      ];
    } else {
      filter.$or = [
        { aiClassification: { $in: ['SPAM', 'POTENTIALLY_FAKE'] } },
        { userClassification: { $in: ['SPAM', 'POTENTIALLY_FAKE'] } },
      ];
    }

    const mentions = await BrandMentionRepository.find(filter)
      .populate('brand', 'name')
      .sort({ publishedAt: -1 });

    res.json({ success: true, count: mentions.length, data: mentions });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually change user classification (GENUINE, SPAM, POTENTIALLY_FAKE) without overwriting AI classification
// @route   POST /api/mentions/:id/classification
// @access  Private
export const updateClassification = async (req, res, next) => {
  const { id } = req.params;
  const { userClassification, userClassificationReason } = req.body;

  if (!['GENUINE', 'SPAM', 'POTENTIALLY_FAKE'].includes(userClassification)) {
    return res.status(400).json({ success: false, message: 'userClassification must be GENUINE, SPAM, or POTENTIALLY_FAKE' });
  }

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    mention.userClassification = userClassification;
    mention.userClassificationReason = userClassificationReason || 'Manually reviewed by brand administrator.';
    mention.updatedBy = req.user._id;
    await mention.save();

    res.json({
      success: true,
      message: 'Classification updated successfully',
      data: {
        id: mention._id,
        aiClassification: mention.aiClassification,
        aiConfidence: mention.aiConfidence,
        aiReason: mention.aiReason,
        userClassification: mention.userClassification,
        userClassificationReason: mention.userClassificationReason,
        updatedBy: mention.updatedBy,
        updatedAt: mention.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI replies for a mention (returns 4 suggestions)
// @route   POST /api/mentions/:id/generate-replies
// @access  Private
export const generateReplies = async (req, res, next) => {
  const { id } = req.params;
  const { tone = 'Professional', language = 'Auto Detect' } = req.body;

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    const suggestions = await generateAIReply({
      content: mention.content,
      sentiment: mention.sentiment,
      emotion: mention.emotion || mention.aiAnalysis?.emotionalTone || 'neutral',
      priority: mention.priority || 'low',
      classification: mention.userClassification !== 'UNSET' ? mention.userClassification : (mention.aiClassification || 'GENUINE'),
      language,
      brandName: brand.name,
      tone,
      location: mention.location?.city ? `${mention.location.city}, ${mention.location.state}` : '',
      author: mention.author || 'Anonymous'
    });

    // Dispatch n8n event
    if (process.env.N8N_WEBHOOK_URL) {
      dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
        event: 'reply.generated',
        timestamp: new Date().toISOString(),
        brandName: brand.name,
        mentionId: mention._id,
        suggestionsCount: suggestions.length
      }).catch(err => logger.error('n8n reply.generated webhook error:', err));
    }

    res.json({
      success: true,
      data: {
        mentionId: mention._id,
        brandId: brand._id,
        suggestions,
        tone,
        language
      }
    });
  } catch (error) {
    next(error);
  }
};

// Legacy single reply endpoint compatibility wrapper
export const generateMentionReply = async (req, res, next) => {
  const { id } = req.params;
  const { tone, language } = req.body;

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    const suggestions = await generateAIReply({
      content: mention.content,
      sentiment: mention.sentiment,
      language: language || mention.language || 'English',
      brandName: brand.name,
      tone: tone || 'Professional',
      author: mention.author
    });

    const replyText = Array.isArray(suggestions) ? (suggestions[0]?.text || '') : suggestions;

    res.json({
      success: true,
      data: {
        mentionId: mention._id,
        reply: replyText,
        suggestions,
        tone: tone || 'Professional',
        language: language || mention.language || 'English',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Select a generated reply for a mention
// @route   POST /api/mentions/:id/select-reply
// @access  Private
export const selectReply = async (req, res, next) => {
  const { id } = req.params;
  const { selectedReply } = req.body;

  if (!selectedReply) {
    return res.status(400).json({ success: false, message: 'selectedReply text is required' });
  }

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    // Store in BrandResponse as GENERATED
    const responseDoc = await BrandResponse.create({
      mention: mention._id,
      brand: brand._id,
      user: req.user._id,
      platform: mention.source || 'web',
      content: selectedReply,
      aiGeneratedResponse: selectedReply,
      finalResponse: selectedReply,
      status: 'GENERATED',
      mode: mention.isDemo ? 'DEMO' : 'LIVE',
      isDemo: mention.isDemo,
    });

    // Dispatch n8n event
    if (process.env.N8N_WEBHOOK_URL) {
      dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
        event: 'reply.selected',
        timestamp: new Date().toISOString(),
        brandName: brand.name,
        mentionId: mention._id,
        responseId: responseDoc._id,
        selectedReply
      }).catch(err => logger.error('n8n reply.selected webhook error:', err));
    }

    res.json({
      success: true,
      message: 'Reply selected successfully',
      data: responseDoc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save reply draft / edited text
// @route   POST /api/mentions/:id/save-reply
// @access  Private
export const saveReply = async (req, res, next) => {
  const { id } = req.params;
  const { content, aiGeneratedResponse, responseId } = req.body;

  if (!content) return res.status(400).json({ success: false, message: 'Reply content is required' });

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    let responseDoc;
    if (responseId) {
      responseDoc = await BrandResponse.findById(responseId);
      if (responseDoc) {
        responseDoc.content = content;
        responseDoc.finalResponse = content;
        if (aiGeneratedResponse) responseDoc.aiGeneratedResponse = aiGeneratedResponse;
        responseDoc.status = 'DRAFT';
        await responseDoc.save();
      }
    }

    if (!responseDoc) {
      responseDoc = await BrandResponse.create({
        mention: mention._id,
        brand: brand._id,
        user: req.user._id,
        platform: mention.source || 'web',
        content,
        aiGeneratedResponse: aiGeneratedResponse || content,
        finalResponse: content,
        status: 'DRAFT',
        mode: mention.isDemo ? 'DEMO' : 'LIVE',
        isDemo: mention.isDemo,
      });
    }

    res.json({
      success: true,
      message: 'Reply draft saved successfully',
      data: responseDoc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve reply
// @route   POST /api/mentions/:id/approve-reply
// @access  Private
export const approveReply = async (req, res, next) => {
  const { id } = req.params;
  const { content, aiGeneratedResponse, responseId } = req.body;

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    let responseDoc;
    if (responseId) {
      responseDoc = await BrandResponse.findById(responseId);
      if (responseDoc) {
        if (content) {
          responseDoc.content = content;
          responseDoc.finalResponse = content;
        }
        responseDoc.status = 'APPROVED';
        await responseDoc.save();
      }
    }

    if (!responseDoc) {
      responseDoc = await BrandResponse.create({
        mention: mention._id,
        brand: brand._id,
        user: req.user._id,
        platform: mention.source || 'web',
        content: content || 'Approved response',
        aiGeneratedResponse: aiGeneratedResponse || content || 'Approved response',
        finalResponse: content || 'Approved response',
        status: 'APPROVED',
        mode: mention.isDemo ? 'DEMO' : 'LIVE',
        isDemo: mention.isDemo,
      });
    }

    // Dispatch n8n event
    if (process.env.N8N_WEBHOOK_URL) {
      dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
        event: 'reply.approved',
        timestamp: new Date().toISOString(),
        brandName: brand.name,
        mentionId: mention._id,
        responseId: responseDoc._id
      }).catch(err => logger.error('n8n reply.approved webhook error:', err));
    }

    res.json({
      success: true,
      message: 'Reply approved successfully',
      data: responseDoc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch reply to platform or demo simulation
// @route   POST /api/mentions/:id/dispatch
// @access  Private
export const dispatchReply = async (req, res, next) => {
  const { id } = req.params;
  const { content, aiGeneratedResponse, responseId, isPlatformConnected = false } = req.body;

  if (!content) return res.status(400).json({ success: false, message: 'Reply content is required for dispatch' });

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    let finalStatus = 'FAILED';
    let errorMsg = '';
    const isDemo = mention.isDemo || !isPlatformConnected;

    if (isPlatformConnected) {
      // If platform API was connected and succeeded
      finalStatus = 'SENT';
    } else {
      // Platform not connected -> Demo mode / simulated
      finalStatus = 'SIMULATED';
      errorMsg = 'Demo Mode - reply simulated successfully.';
    }

    let responseDoc;
    if (responseId) {
      responseDoc = await BrandResponse.findById(responseId);
      if (responseDoc) {
        responseDoc.content = content;
        responseDoc.finalResponse = content;
        responseDoc.status = finalStatus;
        responseDoc.mode = isDemo ? 'DEMO' : 'LIVE';
        responseDoc.isDemo = isDemo;
        responseDoc.sentAt = (finalStatus === 'SENT' || finalStatus === 'SIMULATED') ? new Date() : null;
        responseDoc.error = errorMsg;
        await responseDoc.save();
      }
    }

    if (!responseDoc) {
      responseDoc = await BrandResponse.create({
        mention: mention._id,
        brand: brand._id,
        user: req.user._id,
        platform: mention.source || 'web',
        content,
        aiGeneratedResponse: aiGeneratedResponse || content,
        finalResponse: content,
        status: finalStatus,
        mode: isDemo ? 'DEMO' : 'LIVE',
        isDemo,
        sentAt: (finalStatus === 'SENT' || finalStatus === 'SIMULATED') ? new Date() : null,
        error: errorMsg,
      });
    }

    // Dispatch n8n event
    if (process.env.N8N_WEBHOOK_URL) {
      dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
        event: finalStatus === 'FAILED' ? 'reply.failed' : 'reply.dispatched',
        timestamp: new Date().toISOString(),
        brandName: brand.name,
        mentionId: mention._id,
        responseId: responseDoc._id,
        status: finalStatus,
        content
      }).catch(err => logger.error('n8n reply dispatch webhook error:', err));
    }

    // Email notification if critical or dispatched/failed per existing email architecture
    if (mention.priority === 'critical' || finalStatus === 'SENT' || finalStatus === 'FAILED') {
      try {
        await sendCriticalThreatAlertEmail(
          req.user.email,
          req.user.name,
          brand.name,
          `Reply ${finalStatus.toLowerCase()} for ${mention.priority || 'standard'} mention by @${mention.author}`,
          mention.sentiment,
          `Dispatch Status: ${finalStatus}. Content: "${content}"`
        );
      } catch (emailErr) {
        logger.error(`[MentionController] Reply email alert error: ${emailErr.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: finalStatus === 'SIMULATED'
        ? 'Demo Mode - reply simulated successfully.'
        : (finalStatus === 'SENT' ? 'Reply posted successfully!' : 'Reply failed to dispatch to external platform API.'),
      data: responseDoc
    });
  } catch (error) {
    next(error);
  }
};

// Legacy sendMentionReply wrapper mapped to dispatchReply logic
export const sendMentionReply = async (req, res, next) => {
  return dispatchReply(req, res, next);
};

// @desc    Get response history for a specific mention
// @route   GET /api/mentions/:id/responses
// @access  Private
export const getMentionResponses = async (req, res, next) => {
  const { id } = req.params;

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    const responses = await BrandResponse.find({ mention: mention._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const historyStats = {
      generatedCount: responses.filter(r => ['GENERATED', 'DRAFT', 'APPROVED', 'SENT', 'SIMULATED', 'FAILED'].includes(r.status)).length,
      selectedCount: responses.filter(r => ['APPROVED', 'SENT', 'SIMULATED', 'FAILED'].includes(r.status)).length,
      dispatchedCount: responses.filter(r => ['SENT', 'SIMULATED'].includes(r.status)).length,
    };

    res.json({
      success: true,
      count: responses.length,
      stats: historyStats,
      data: responses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all brand response records (Draft, Approved, Sent, Failed)
// @route   GET /api/responses
// @access  Private
export const getResponses = async (req, res, next) => {
  const { brandId, status } = req.query;

  try {
    const filter = {};
    if (brandId) {
      filter.brand = brandId;
    } else {
      const brands = await BrandRepository.find({ organization: req.user.organization });
      filter.brand = { $in: brands.map(b => b._id) };
    }

    if (status) {
      filter.status = status.toUpperCase();
    }

    const responses = await BrandResponse.find(filter)
      .populate('mention', 'content author source sentiment')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: responses.length, data: responses });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a response record (e.g. edit draft or approve)
// @route   PATCH /api/responses/:id
// @access  Private
export const updateResponse = async (req, res, next) => {
  const { id } = req.params;
  const { content, status } = req.body;

  try {
    const responseDoc = await BrandResponse.findById(id);
    if (!responseDoc) return res.status(404).json({ success: false, message: 'Response record not found' });

    const brand = await BrandRepository.findOne({ _id: responseDoc.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    if (content !== undefined) {
      responseDoc.content = content;
      responseDoc.finalResponse = content;
    }
    if (status !== undefined) responseDoc.status = status;
    await responseDoc.save();

    res.json({ success: true, data: responseDoc });
  } catch (error) {
    next(error);
  }
};

// @desc    Retry sending a failed response
// @route   POST /api/responses/:id/retry
// @access  Private
export const retryResponse = async (req, res, next) => {
  const { id } = req.params;

  try {
    const responseDoc = await BrandResponse.findById(id);
    if (!responseDoc) return res.status(404).json({ success: false, message: 'Response record not found' });

    const brand = await BrandRepository.findOne({ _id: responseDoc.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    responseDoc.status = 'SIMULATED';
    responseDoc.mode = 'DEMO';
    responseDoc.isDemo = true;
    responseDoc.sentAt = new Date();
    responseDoc.error = 'Demo Mode - simulated retry succeeded.';
    await responseDoc.save();

// @desc    Submit a Report Case for a mention (Spam, Fake Review, Fake News, Harassment, etc.)
// @route   POST /api/mentions/:id/report
// @access  Private
export const createReportCase = async (req, res, next) => {
  const { id } = req.params;
  const { reason = 'Spam', notes = '' } = req.body;

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    const reportCase = await ReportCase.create({
      brand: brand._id,
      mention: mention._id,
      user: req.user._id,
      reason,
      notes,
      status: mention.isDemo ? 'SIMULATED' : 'OPEN',
      mode: mention.isDemo ? 'DEMO' : 'LIVE',
      isDemo: mention.isDemo,
    });

    // Dispatch n8n event
    if (process.env.N8N_WEBHOOK_URL) {
      dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
        event: 'report.created',
        timestamp: new Date().toISOString(),
        brandName: brand.name,
        reportId: reportCase._id,
        reason,
        status: reportCase.status
      }).catch(err => logger.error('n8n report.created webhook error:', err));
    }

    res.status(201).json({
      success: true,
      message: mention.isDemo 
        ? 'Demo Report Created: Internal platform report recorded successfully.'
        : 'Report case submitted successfully for review.',
      data: reportCase
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restrict mention content (Simulated or Real platform)
// @route   POST /api/mentions/:id/restrict
// @access  Private
export const createRestrictionRecord = async (req, res, next) => {
  const { id } = req.params;
  const { actionType = 'RESTRICT_CONTENT', isPlatformConnected = false } = req.body;

  try {
    const mention = await BrandMentionRepository.findById(id);
    if (!mention) return res.status(404).json({ success: false, message: 'Mention not found' });

    const brand = await BrandRepository.findOne({ _id: mention.brand, organization: req.user.organization });
    if (!brand) return res.status(403).json({ success: false, message: 'Not authorized' });

    const isDemo = mention.isDemo || !isPlatformConnected;
    const status = isPlatformConnected ? 'ACTIVE' : 'SIMULATED';
    const message = isPlatformConnected
      ? 'Content successfully restricted via connected platform API.'
      : 'Demo restriction recorded. External platform API is not configured.';

    const restriction = await RestrictionRecord.create({
      brand: brand._id,
      mention: mention._id,
      user: req.user._id,
      actionType,
      status,
      mode: isDemo ? 'DEMO' : 'LIVE',
      isDemo,
      message,
    });

    res.status(201).json({
      success: true,
      message,
      data: restriction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get report cases history
// @route   GET /api/mentions/reports/cases
// @access  Private
export const getReportCases = async (req, res, next) => {
  const { brandId } = req.query;

  try {
    const filter = {};
    if (brandId) {
      filter.brand = brandId;
    } else {
      const brands = await BrandRepository.find({ organization: req.user.organization });
      filter.brand = { $in: brands.map(b => b._id) };
    }

    const cases = await ReportCase.find(filter)
      .populate('mention', 'content author source')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all demo data (removes only isDemo=true records)
// @route   DELETE /api/mentions/brand/:brandId/demo-data
// @access  Private
export const clearDemoData = async (req, res, next) => {
  const { brandId } = req.params;

  try {
    const brand = await BrandRepository.findOne({ _id: brandId, organization: req.user.organization });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    const deletedMentions = await BrandMentionRepository.model.deleteMany({ brand: brandId, isDemo: true });
    await BrandResponse.deleteMany({ brand: brandId, isDemo: true });
    await ReportCase.deleteMany({ brand: brandId, isDemo: true });
    await RestrictionRecord.deleteMany({ brand: brandId, isDemo: true });

    res.json({
      success: true,
      message: `Cleared ${deletedMentions.deletedCount || 0} demo records for ${brand.name}. Live data remains untouched.`,
    });
  } catch (error) {
    next(error);
  }
};


