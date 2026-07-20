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

/**
 * Analyzes the sentiment of a text content using Gemini AI.
 * 
 * @param {string} content Text to analyze
 * @returns {Promise<object>} AI Analysis result containing sentiment, score, key themes, and suggestions.
 */
export const analyzeContent = async (content) => {
  logger.info(`[Gemini Service] Analyzing content: "${content.substring(0, 60)}..."`);
  const client = getGenAIClient();
  
  const model = client.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert brand analyst. Analyze the sentiment and context of the following social media post or article.
    Return the output as a valid JSON object matching this schema:
    {
      "sentiment": "positive" | "neutral" | "negative",
      "sentimentScore": float between -1.0 (very negative) and 1.0 (very positive),
      "keyThemes": [string],
      "emotionalTone": string describing the emotion (e.g. "frustrated", "excited", "skeptical"),
      "suggestedAction": string suggesting how the brand should respond,
      "explanation": string summarizing why you gave this sentiment
    }

    Content to analyze:
    "${content.replace(/"/g, '\\"')}"
  `;

  const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'Content Sentiment Analysis' });
  const text = result.response.text();
  logger.info(`[Gemini Service] Received raw response: ${text.trim()}`);
  
  const parsedData = JSON.parse(text);
  return {
    sentiment: parsedData.sentiment || 'neutral',
    sentimentScore: parsedData.sentimentScore !== undefined ? parsedData.sentimentScore : 0.0,
    keyThemes: parsedData.keyThemes || [],
    emotionalTone: parsedData.emotionalTone || 'neutral',
    suggestedAction: parsedData.suggestedAction || 'No immediate action required.',
    explanation: parsedData.explanation || 'Analyzed by BrandPulse AI.',
  };
};

/**
 * Generates chat assistant response text using the existing Gemini client.
 * 
 * @param {string} systemInstruction System instructions defining persona, context, and bounds
 * @param {string} userQuery The user's query text
 * @param {Array} history Conversation history: [{ role: 'user'|'model', text: string }]
 * @returns {Promise<string>} AI Assistant response text
 */
export const generateAssistantResponse = async (systemInstruction, userQuery, history = []) => {
  logger.info('[Gemini Service] Requesting assistant response...');
  const client = getGenAIClient();
  
  const model = client.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: systemInstruction,
  });

  let cleanHistory = [];

  if (history && history.length > 0) {
    const validMessages = history.filter(msg => msg.text && msg.text.trim());
    
    // We must ensure the history starts with 'user'.
    // Skip any leading 'model' messages (e.g. initial greeting message).
    let startIndex = 0;
    while (startIndex < validMessages.length && validMessages[startIndex].role !== 'user') {
      startIndex++;
    }

    let expectedRole = 'user';
    for (let i = startIndex; i < validMessages.length; i++) {
      const msg = validMessages[i];
      const role = msg.role === 'user' ? 'user' : 'model';

      if (role === expectedRole) {
        cleanHistory.push({
          role: role,
          parts: [{ text: msg.text }]
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      } else {
        // Concatenate to last message of the same role if consecutive, or repair
        if (cleanHistory.length > 0) {
          cleanHistory[cleanHistory.length - 1].parts[0].text += `\n\n${msg.text}`;
        } else if (role === 'user') {
          cleanHistory.push({
            role: 'user',
            parts: [{ text: msg.text }]
          });
          expectedRole = 'model';
        }
      }
    }
  }

  // Trim trailing user message from history turns to prevent duplicate consecutive user turns
  if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
    logger.info('[Gemini Service] Trimming trailing user message from history turns');
    cleanHistory.pop();
  }

  logger.info(`[Gemini Service] Sanitized history length: ${cleanHistory.length}`);
  if (cleanHistory.length > 0) {
    logger.info(`[Gemini Service] First role in history: ${cleanHistory[0].role}`);
  }
  logger.info(`[Gemini Service] Final history turns: ${JSON.stringify(cleanHistory.map(h => ({ role: h.role, textLength: h.parts[0].text.length })))}`);

  const chat = model.startChat({
    history: cleanHistory,
  });

  const result = await geminiQueue.enqueue(() => chat.sendMessage(userQuery), { label: 'Assistant Response' });
  const text = result.response.text();
  logger.info('[Gemini Service] Successfully received assistant response');
  return text;
};

/**
 * Analyzes news articles related to a brand using Gemini AI.
 * 
 * @param {string} brandName Brand name
 * @param {Array} articles List of articles: [{ title, description, source, publishedAt, url }]
 * @returns {Promise<object>} AI Analysis result
 */
export const analyzeNewsArticles = async (brandName, articles) => {
  logger.info(`[Gemini Service] Analyzing news for brand: ${brandName} (${articles?.length || 0} articles)`);
  
  if (!articles || articles.length === 0) {
    return {
      overallSentiment: 'neutral',
      positiveHighlights: [],
      negativeHighlights: [],
      reputationScore: 50,
      trendingTopics: [],
      businessRisks: [],
      executiveSummary: `No news articles available to analyze for brand "${brandName}".`,
      actionableRecommendations: [],
      confidenceScore: 0.0
    };
  }

  // Format articles into string for prompt
  const articlesText = articles.map((art, idx) => `
Article #${idx + 1}:
Title: ${art.title}
Source: ${art.source || 'Unknown'}
Published At: ${art.publishedAt}
Description: ${art.description || 'No description available.'}
  `).join('\n\n');

  const client = getGenAIClient();
  
  const model = client.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert enterprise brand analyst. Analyze the following news articles related to the brand "${brandName}".
    Evaluate the public perception, trends, and sentiment of the brand based on these articles.
    
    You MUST scan the articles specifically for brand risks such as:
    - Boycotts or public backlash
    - Fraud or scam allegations
    - Negative PR or smear campaigns
    - Legal, lawsuits, or regulatory issues
    - Product recalls or safety concerns
    - Customer complaints or mass dissatisfaction
    - Supply chain disruptions
    - Competitor attacks or hostile positioning
    - Brand reputation threats
    
    If any of these are present, detail them explicitly inside the "businessRisks" field, highlight them under "negativeHighlights", and downgrade the "reputationScore" as appropriate.

    Return the output as a valid JSON object matching this schema:
    {
      "overallSentiment": "positive" | "neutral" | "negative",
      "positiveHighlights": [string],
      "negativeHighlights": [string],
      "reputationScore": float/integer between 0 (critical threat) and 100 (excellent),
      "trendingTopics": [string],
      "businessRisks": [string],
      "executiveSummary": string (a comprehensive summary of public perception based on the news),
      "actionableRecommendations": [string],
      "confidenceScore": float between 0.0 and 1.0 (indicating your confidence in this analysis),
      "articleSentiments": [
        {
          "title": "string (the exact title of the article)",
          "sentiment": "positive" | "neutral" | "negative"
        }
      ]
    }

    News articles:
    ${articlesText}
  `;

  try {
    const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'News Articles Analysis' });
    const text = result.response.text();
    logger.info(`[Gemini Service] Received raw news analysis response: ${text.trim()}`);
    
    const parsedData = JSON.parse(text);
    return {
      overallSentiment: parsedData.overallSentiment || 'neutral',
      positiveHighlights: parsedData.positiveHighlights || [],
      negativeHighlights: parsedData.negativeHighlights || [],
      reputationScore: parsedData.reputationScore !== undefined ? parsedData.reputationScore : 50,
      trendingTopics: parsedData.trendingTopics || [],
      businessRisks: parsedData.businessRisks || [],
      executiveSummary: parsedData.executiveSummary || 'News analysis completed by BrandPulse AI.',
      actionableRecommendations: parsedData.actionableRecommendations || [],
      confidenceScore: parsedData.confidenceScore !== undefined ? parsedData.confidenceScore : 0.8,
      articleSentiments: parsedData.articleSentiments || []
    };
  } catch (error) {
    logger.error('[Gemini Service] Error during news analysis:', error);
    return {
      overallSentiment: 'neutral',
      positiveHighlights: ['Unable to parse positive highlights due to analysis fallback.'],
      negativeHighlights: ['Unable to parse negative highlights due to analysis fallback.'],
      reputationScore: 50,
      trendingTopics: [],
      businessRisks: [],
      executiveSummary: `Analysis fallback for brand "${brandName}". Could not complete live Gemini parsing.`,
      actionableRecommendations: ['Check the original news sources directly.'],
      confidenceScore: 0.5,
      articleSentiments: []
    };
  }
};
