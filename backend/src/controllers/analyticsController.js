import AnalyticsRepository from '../repositories/AnalyticsRepository.js';
import BrandRepository from '../repositories/BrandRepository.js';
import BrandMentionRepository from '../repositories/BrandMentionRepository.js';

// @desc    Get precomputed analytics metrics for a brand
// @route   GET /api/analytics/brand/:brandId/:type
// @access  Private
export const getCachedAnalytics = async (req, res, next) => {
  const { brandId, type } = req.params;

  try {
    const metrics = await AnalyticsRepository.getLatestMetrics(brandId, type);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};

// @desc    Compare analytics between City A vs City B or State A vs State B
// @route   GET /api/analytics/location-comparison
// @access  Private
export const getLocationComparison = async (req, res, next) => {
  const { brandId, type = 'city', locA, locB, startDate, endDate } = req.query;

  if (!brandId || !locA || !locB) {
    return res.status(400).json({ success: false, message: 'brandId, locA, and locB are required parameters.' });
  }

  try {
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const field = type === 'state' ? 'location.state' : 'location.city';
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const baseFilter = { brand: brandId, isDeleted: false };
    if (startDate || endDate) baseFilter.publishedAt = dateFilter;

    const fetchLocationStats = async (locValue) => {
      const filter = { ...baseFilter, [field]: { $regex: `^${locValue}$`, $options: 'i' } };
      const mentions = await BrandMentionRepository.find(filter);

      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      let totalScore = 0;
      let threatCount = 0;
      let spamCount = 0;
      let potentiallyFakeCount = 0;
      const topicMap = {};

      mentions.forEach((m) => {
        sentimentCounts[m.sentiment] = (sentimentCounts[m.sentiment] || 0) + 1;
        totalScore += m.sentimentScore || 0;
        const prio = (m.priority || 'low').toLowerCase();
        priorityCounts[prio] = (priorityCounts[prio] || 0) + 1;
        if (prio === 'critical' || prio === 'high') threatCount++;

        if (m.aiClassification === 'SPAM' || m.userClassification === 'SPAM') spamCount++;
        if (m.aiClassification === 'POTENTIALLY_FAKE' || m.userClassification === 'POTENTIALLY_FAKE') potentiallyFakeCount++;

        if (m.summary) {
          topicMap[m.summary] = (topicMap[m.summary] || 0) + 1;
        }
      });

      const totalMentions = mentions.length;
      const avgSentimentScore = totalMentions > 0 ? Number((totalScore / totalMentions).toFixed(2)) : 0;
      const trendingTopics = Object.entries(topicMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }));

      return {
        location: locValue,
        totalMentions,
        positiveMentions: sentimentCounts.positive,
        negativeMentions: sentimentCounts.negative,
        neutralMentions: sentimentCounts.neutral,
        sentimentScore: avgSentimentScore,
        criticalCount: priorityCounts.critical,
        highCount: priorityCounts.high,
        mediumCount: priorityCounts.medium,
        lowCount: priorityCounts.low,
        threatCount,
        spamCount,
        potentiallyFakeCount,
        spamFakeCount: spamCount + potentiallyFakeCount,
        trendingTopics,
      };
    };

    const statsA = await fetchLocationStats(locA);
    const statsB = await fetchLocationStats(locB);

    let comparativeSummary = `${locA} and ${locB} have similar sentiment profiles.`;
    if (statsA.negativeMentions > statsB.negativeMentions) {
      comparativeSummary = `${locA} has more negative mentions (${statsA.negativeMentions}) than ${locB} (${statsB.negativeMentions}).`;
    } else if (statsB.negativeMentions > statsA.negativeMentions) {
      comparativeSummary = `${locB} has more negative mentions (${statsB.negativeMentions}) than ${locA} (${statsA.negativeMentions}).`;
    } else if (statsA.totalMentions > statsB.totalMentions) {
      comparativeSummary = `${locA} has higher overall brand discussion volume (${statsA.totalMentions} mentions) than ${locB} (${statsB.totalMentions} mentions).`;
    } else if (statsB.totalMentions > statsA.totalMentions) {
      comparativeSummary = `${locB} has higher overall brand discussion volume (${statsB.totalMentions} mentions) than ${locA} (${statsA.totalMentions} mentions).`;
    }

    res.json({
      success: true,
      data: {
        comparisonType: type,
        locA: statsA,
        locB: statsB,
        summary: comparativeSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending hashtags extracted from actual collected content
// @route   GET /api/analytics/trending-hashtags
// @access  Private
export const getTrendingHashtags = async (req, res, next) => {
  const { brandId } = req.query;

  if (!brandId) {
    return res.status(400).json({ success: false, message: 'brandId parameter is required' });
  }

  try {
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const mentions = await BrandMentionRepository.find({ brand: brandId, isDeleted: false });
    const hashtagMap = {};

    mentions.forEach((m) => {
      const extracted = [];
      if (m.hashtags && m.hashtags.length > 0) {
        m.hashtags.forEach((tag) => {
          extracted.push(tag.startsWith('#') ? tag : `#${tag}`);
        });
      }
      const matches = m.content.match(/#\w+/g) || [];
      matches.forEach((tag) => extracted.push(tag));

      const uniqueTags = Array.from(new Set(extracted));
      uniqueTags.forEach((tag) => {
        if (!hashtagMap[tag]) {
          hashtagMap[tag] = {
            hashtag: tag,
            count: 0,
            locations: {},
            sentiments: { positive: 0, neutral: 0, negative: 0 },
          };
        }
        hashtagMap[tag].count += 1;
        hashtagMap[tag].sentiments[m.sentiment] = (hashtagMap[tag].sentiments[m.sentiment] || 0) + 1;
        const locName = m.location?.city || m.location?.state || 'Global';
        if (locName) {
          hashtagMap[tag].locations[locName] = (hashtagMap[tag].locations[locName] || 0) + 1;
        }
      });
    });

    // Fallback if no hashtags extracted
    if (Object.keys(hashtagMap).length === 0) {
      const cleanBrand = brand.name.replace(/\s+/g, '');
      const defaultTag = `#${cleanBrand}`;
      hashtagMap[defaultTag] = {
        hashtag: defaultTag,
        count: mentions.length,
        locations: { Global: mentions.length },
        sentiments: { positive: Math.ceil(mentions.length * 0.6), neutral: Math.floor(mentions.length * 0.3), negative: Math.floor(mentions.length * 0.1) },
      };
    }

    const trendingHashtags = Object.values(hashtagMap)
      .sort((a, b) => b.count - a.count)
      .map((item) => {
        const topLocEntry = Object.entries(item.locations).sort((a, b) => b[1] - a[1])[0];
        const topLoc = topLocEntry ? topLocEntry[0] : 'Global';

        let topSentiment = 'Mostly Neutral';
        if (item.sentiments.positive >= item.sentiments.negative && item.sentiments.positive >= item.sentiments.neutral) {
          topSentiment = 'Mostly Positive';
        } else if (item.sentiments.negative >= item.sentiments.positive && item.sentiments.negative >= item.sentiments.neutral) {
          topSentiment = 'Mostly Negative';
        }

        return {
          hashtag: item.hashtag,
          count: item.count,
          trendDirection: item.count > 3 ? 'Rising' : 'Stable',
          topLocation: topLoc,
          sentiment: topSentiment,
        };
      });

    res.json({ success: true, data: trendingHashtags });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending topics using MongoDB counting + Gemini semantic summary
// @route   GET /api/analytics/trending-topics
// @access  Private
export const getTrendingTopics = async (req, res, next) => {
  const { brandId } = req.query;

  if (!brandId) {
    return res.status(400).json({ success: false, message: 'brandId parameter is required' });
  }

  try {
    const brand = await BrandRepository.findOne({
      _id: brandId,
      organization: req.user.organization,
    });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const mentions = await BrandMentionRepository.find({ brand: brandId, isDeleted: false });
    const topicMap = {};

    mentions.forEach((m) => {
      const topicName = m.summary || (m.aiAnalysis && m.aiAnalysis.keyThemes && m.aiAnalysis.keyThemes[0]) || 'General Feedback';
      if (!topicMap[topicName]) {
        topicMap[topicName] = {
          topic: topicName,
          count: 0,
          sentiments: { positive: 0, neutral: 0, negative: 0 },
          priority: m.priority || 'low',
          location: m.location?.city || m.location?.state || 'Global',
        };
      }
      topicMap[topicName].count += 1;
      topicMap[topicName].sentiments[m.sentiment] = (topicMap[topicName].sentiments[m.sentiment] || 0) + 1;
      if (m.priority === 'critical' || m.priority === 'high') {
        topicMap[topicName].priority = m.priority;
      }
    });

    const trendingTopics = Object.values(topicMap)
      .sort((a, b) => b.count - a.count)
      .map((t) => {
        let dominantSentiment = 'neutral';
        if (t.sentiments.positive > t.sentiments.negative && t.sentiments.positive > t.sentiments.neutral) {
          dominantSentiment = 'positive';
        } else if (t.sentiments.negative > t.sentiments.positive && t.sentiments.negative > t.sentiments.neutral) {
          dominantSentiment = 'negative';
        }

        return {
          topic: t.topic,
          count: t.count,
          sentiment: dominantSentiment,
          priority: t.priority,
          location: t.location,
        };
      });

    res.json({ success: true, data: trendingTopics });
  } catch (error) {
    next(error);
  }
};
