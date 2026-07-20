import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';
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

export const generateThreatFallback = (content, sentiment) => {
  const lowercase = (content || '').toLowerCase();
  let priority = 'low';
  const detectedThreats = [];

  // Keywords matching new threats
  const spamKeywords = ['gift card', 'make money', 'click here', 'follow me', 'buy bitcoin', 'free follow', 'spam'];
  const fakeReviewKeywords = ['fake review', 'paid review', 'bot review', '5 stars', '1 star'];
  const coordinatedAbuseKeywords = ['boycott', 'cancel', 'abuse', 'coordinated', 'raid', 'hater'];
  const reputationAttackKeywords = ['slander', 'defame', 'liar', 'crook', 'scam', 'fraud'];
  const fakeCampaignKeywords = ['fake campaign', 'hijack', 'impersonator', 'phishing'];
  const sentimentSpikeKeywords = ['wow!', 'worst ever', 'hated it', 'love it', 'amazing!'];

  if (spamKeywords.some(kw => lowercase.includes(kw))) {
    priority = 'medium';
    detectedThreats.push('spam');
  }
  if (fakeReviewKeywords.some(kw => lowercase.includes(kw))) {
    priority = 'medium';
    detectedThreats.push('fake_reviews');
  }
  if (coordinatedAbuseKeywords.some(kw => lowercase.includes(kw))) {
    priority = 'high';
    detectedThreats.push('coordinated_abuse');
  }
  if (reputationAttackKeywords.some(kw => lowercase.includes(kw))) {
    priority = 'high';
    detectedThreats.push('reputation_attacks');
  }
  if (fakeCampaignKeywords.some(kw => lowercase.includes(kw))) {
    priority = 'high';
    detectedThreats.push('fake_campaigns');
  }
  if (sentimentSpikeKeywords.some(kw => lowercase.includes(kw))) {
    priority = 'medium';
    detectedThreats.push('sentiment_spike');
  }

  // Legacy fallback rules
  if (lowercase.includes('outage') || lowercase.includes('down') || lowercase.includes('breached') || lowercase.includes('hacker')) {
    priority = 'critical';
    detectedThreats.push('crisis', 'reputation_risk');
  } else if (lowercase.includes('billing') || lowercase.includes('refund') || lowercase.includes('lie') || lowercase.includes('lied') || lowercase.includes('hate')) {
    priority = 'high';
    detectedThreats.push('complaint', 'support');
  } else if (lowercase.includes('query') || lowercase.includes('price') || lowercase.includes('shipping') || lowercase.includes('how to')) {
    if (priority === 'low') priority = 'medium';
    detectedThreats.push('support');
  }

  return {
    priority,
    detectedThreats: Array.from(new Set(detectedThreats)),
    explanation: 'Threat classification processed using regional identity local fallback rules.'
  };
};

/**
 * Evaluates brand mention content to classify threats and priority ratings.
 * 
 * @param {string} content Mention text body
 * @param {string} sentiment Analyzed sentiment ('positive' | 'neutral' | 'negative')
 * @returns {Promise<object>} Threat analysis result containing priority and threat categories
 */
export const analyzeMentionThreats = async (content, sentiment) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey.startsWith('your_')) {
    logger.warn('[Threat Service] GEMINI_API_KEY is missing or placeholder. Running local threat fallback...');
    return generateThreatFallback(content, sentiment);
  }

  logger.info(`[Threat Service] Evaluating threat context using gemini-3.1-flash-lite...`);
  const client = getGenAIClient();

  const model = client.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert AI threat analyst and brand safety monitor specialized in regional markets.
    Analyze the following brand mention to detect potential threats and classify response priority.
    
    You must evaluate for these specific threat categories:
    - Complaint (customer expressing dissatisfaction)
    - Crisis (severe issue, major product failure, system outage)
    - Negative trend (growing complaints or organized backlash)
    - Fake news / misinformation indicators (false claims, manipulation)
    - Customer support issues (help request, billing, bugs)
    - Reputation risk (scandals, legal threats, ethical concerns)
    - Fake reviews (bot reviews, paid reviews, copy-paste reviews)
    - Reputation attacks (defamatory regional campaigns, slander)
    - Fake campaigns (brand impersonation, phishing campaigns)
    - Spam (irrelevant promotion, link spam, automated spam)
    - Coordinated abuse (trolling, cancel campaigns, coordinated regional backlash)
    - Sudden sentiment spikes (anomalous emotional outbreaks or rapid sentiment transitions)
    
    Assign a priority based on severity:
    - "critical": Active crisis, massive reputation damage, security breach, total system outage, or legal/regulatory threats.
    - "high": Clear complaints, negative trends, fake news claims, major customer support bugs, or moderate reputation risks.
    - "medium": Mild complaints, standard customer support queries, or minor misinformation.
    - "low": Neutral statements, general queries, positive feedback, or no threat.
    
    Return the output as a valid JSON object matching this schema:
    {
      "detectedThreats": ["complaint" | "crisis" | "negative_trend" | "fake_news" | "support" | "reputation_risk" | "fake_reviews" | "reputation_attacks" | "fake_campaigns" | "spam" | "coordinated_abuse" | "sentiment_spike"],
      "priority": "critical" | "high" | "medium" | "low",
      "explanation": "A short one-sentence explanation of why this priority was assigned."
    }
    
    Content to analyze:
    "${content.replace(/"/g, '\\"')}"
  `;

  const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'Mention Threat Analysis' });
  const text = result.response.text();
  logger.info(`[Threat Service] Raw threat analysis result: ${text.trim()}`);

  const parsedData = JSON.parse(text);
  
  // Ensure values comply with the schema restrictions
  const priority = ['critical', 'high', 'medium', 'low'].includes(parsedData.priority) 
    ? parsedData.priority 
    : 'low';

  return {
    priority,
    detectedThreats: parsedData.detectedThreats || [],
    explanation: parsedData.explanation || 'Threat evaluation completed by BrandPulse AI.'
  };
};
