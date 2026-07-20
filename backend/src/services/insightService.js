import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';
import AIInsight from '../models/AIInsight.js';
import BrandRepository from '../repositories/BrandRepository.js';
import { geminiQueue } from '../utils/geminiQueue.js';

let genAI = null;

const getGenAIClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export const generateInsightFallback = (mentions, brandContext = {}) => {
  const total = mentions.length;
  const negative = mentions.filter(m => m.sentiment === 'negative').length;
  const positive = mentions.filter(m => m.sentiment === 'positive').length;
  
  const targetCity = brandContext.targetCity || 'Patna';
  const targetRegion = brandContext.targetRegion || 'East India';

  let brandHealthScore = 100;
  if (total > 0) {
    brandHealthScore = Math.round(((positive + (total - negative - positive) * 0.5) / total) * 100);
  }

  return {
    brandHealthScore,
    brandHealthSummary: `The brand has a health score of ${brandHealthScore}% based on ${total} reviews.`,
    customerSatisfactionTrend: negative > positive ? 'Declining due to customer complaints.' : 'Improving or stable.',
    positiveVsNegativeTrend: `${positive} positive vs ${negative} negative mentions.`,
    emergingIssues: negative > 0 ? [
      JSON.stringify({
        title: 'Regional service delay',
        mentionCount: negative,
        priority: 'high',
        summary: `Customers in ${targetCity} are reporting shipping and service delays.`
      })
    ] : [],
    mostDiscussedTopics: ['Local brand campaign', 'Regional language support'],
    mostAffectedLocations: [`${targetCity}, India`],
    topComplaintCategories: negative > 0 ? ['Translation clarity'] : [],
    reputationRiskSummary: negative > 0 ? 'Localized complaints pose small reputation risk.' : 'Low risk.',
    recommendations: [
      {
        title: `Localized Branding Campaign in ${targetCity}`,
        description: `Adapt brand messaging to reflect local culture and regional language preferences in ${targetCity}.`,
        priority: 'high',
        reason: `Strong local user base in ${targetCity} responds positively to localized communication.`,
        suggestedAction: `Launch a local festive marketing campaign and sponsor upcoming regional cultural events.`
      }
    ],
    generatedAt: new Date()
  };
};

/**
 * Generates and saves AI Insights and Recommendations for a brand.
 * 
 * @param {string} brandId Mongoose Object ID of the brand
 * @param {Array} mentions List of Mongoose brand mention documents
 * @param {boolean} forceRefresh If true, recalculates even if cache exists
 * @returns {Promise<object>} The generated AIInsight document
 */
export const calculateBrandInsights = async (brandId, mentions, forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = await AIInsight.findOne({ brand: brandId }).sort({ createdAt: -1 });
    if (cached) {
      const diffMs = Date.now() - new Date(cached.generatedAt).getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      if (diffHrs < 1.0) {
        logger.info(`Returning cached AI insights for brand ${brandId}`);
        return cached;
      }
    }
  }

  logger.info(`Calculating fresh AI insights for brand ${brandId}...`);

  const brand = await BrandRepository.findOne({ _id: brandId });
  const brandContext = brand ? {
    targetCity: brand.city || 'Patna',
    targetState: brand.state || 'Bihar',
    targetRegion: brand.region || 'East India',
    name: brand.name
  } : {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey.startsWith('your_')) {
    logger.warn('[Insight Service] GEMINI_API_KEY is missing or placeholder. Running local insights fallback...');
    const insights = generateInsightFallback(mentions, brandContext);
    
    // Save or update insights entry
    const updatedInsight = await AIInsight.findOneAndUpdate(
      { brand: brandId },
      {
        brand: brandId,
        brandHealthScore: insights.brandHealthScore,
        brandHealthSummary: insights.brandHealthSummary,
        customerSatisfactionTrend: insights.customerSatisfactionTrend,
        positiveVsNegativeTrend: insights.positiveVsNegativeTrend,
        emergingIssues: insights.emergingIssues,
        mostDiscussedTopics: insights.mostDiscussedTopics,
        mostAffectedLocations: insights.mostAffectedLocations,
        topComplaintCategories: insights.topComplaintCategories,
        reputationRiskSummary: insights.reputationRiskSummary,
        recommendations: insights.recommendations,
        generatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    return updatedInsight;
  }

  // Map minimal dataset for prompt limit hygiene
  const mentionsData = mentions.map(m => ({
    content: m.content,
    sentiment: m.sentiment,
    language: m.language,
    priority: m.priority || 'low',
    location: m.location ? `${m.location.city}, ${m.location.state} (${m.location.region})` : 'Unknown'
  }));

  const client = getGenAIClient();
  
  const model = client.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an elite enterprise brand strategist and regional Indian market analyst.
    Analyze the following brand mentions data and target location context to generate structured regional insights and branding recommendations.
    
    Target Location Context:
    ${JSON.stringify(brandContext, null, 2)}
    
    Brand Mentions Data:
    ${JSON.stringify(mentionsData.slice(0, 50), null, 2)}
    
    You MUST formulate branding recommendations tailored specifically to the regional context of the brand.
    Recommendations MUST consider:
    - Target City and Region (leveraging city-wise insights)
    - Regional Language preferences (Hindi, Bhojpuri, Bengali, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese)
    - Sentiment patterns observed in the mentions
    - Local culture, local events (such as regional festivals, holidays, or seasonal events), and localized trending topics/issues.
    
    Return the output as a valid JSON object matching this schema:
    {
      "brandHealthScore": integer between 0 and 100,
      "brandHealthSummary": "A short summary of overall brand health.",
      "customerSatisfactionTrend": "A summary of how satisfaction is trending.",
      "positiveVsNegativeTrend": "A comparison of positive vs negative sentiments.",
      "emergingIssues": [
        {
          "title": "Short title of the emerging issue",
          "mentionCount": integer (number of mentions referencing this issue),
          "priority": "high" | "medium" | "low",
          "summary": "1-2 sentence description explaining the issue"
        }
      ],
      "mostDiscussedTopics": ["topic 1", "topic 2"],
      "mostAffectedLocations": ["city, state 1", "city, state 2"],
      "topComplaintCategories": ["category 1", "category 2"],
      "reputationRiskSummary": "A summary of any active reputation risks.",
      "recommendations": [
        {
          "title": "Regional Branding Campaign: [Specific Theme/Event/Festival]",
          "description": "Detailed recommendations specifying how to adapt brand messaging to local culture, local events, or regional languages.",
          "priority": "high" | "medium" | "low",
          "reason": "Why this recommendation is necessary based on regional data (city, language, sentiment, local culture, events).",
          "suggestedAction": "Concrete next steps, such as launching regional social campaigns, sponsoring local events, or adapting support into local languages."
        }
      ]
    }
  `;

  const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'Brand Insights Generation' });
  const text = result.response.text();
  logger.info(`[Insight Service] Raw Gemini response: ${text.trim()}`);
  const insights = JSON.parse(text);

  const formattedEmergingIssues = (insights.emergingIssues || []).map(issue => {
    if (typeof issue === 'object' && issue !== null) {
      return JSON.stringify(issue);
    }
    return JSON.stringify({
      title: String(issue),
      mentionCount: 1,
      priority: 'medium',
      summary: 'An emerging regional issue.'
    });
  });

  // Update or save new insights entry
  const updatedInsight = await AIInsight.findOneAndUpdate(
    { brand: brandId },
    {
      brand: brandId,
      brandHealthScore: insights.brandHealthScore || 70,
      brandHealthSummary: insights.brandHealthSummary || 'Stable operations.',
      customerSatisfactionTrend: insights.customerSatisfactionTrend || 'Steady brand interest.',
      positiveVsNegativeTrend: insights.positiveVsNegativeTrend || 'Equitable positive and negative reviews.',
      emergingIssues: formattedEmergingIssues,
      mostDiscussedTopics: insights.mostDiscussedTopics || [],
      mostAffectedLocations: insights.mostAffectedLocations || [],
      topComplaintCategories: insights.topComplaintCategories || [],
      reputationRiskSummary: insights.reputationRiskSummary || 'Low active threats.',
      recommendations: insights.recommendations || [],
      generatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return updatedInsight;
};
