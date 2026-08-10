import BrandRepository from '../repositories/BrandRepository.js';
import BrandMentionRepository from '../repositories/BrandMentionRepository.js';
import ReportRepository from '../repositories/ReportRepository.js';
import AIInsight from '../models/AIInsight.js';
import { pushNotification } from '../services/notificationService.js';
import { generateAssistantResponse } from '../services/geminiService.js';
import logger from '../config/logger.js';

const getLocalAssistantResponse = (message, userName = 'there') => {
  if (!message) return null;
  const query = message.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  
  const greetings = ['hi', 'hello', 'hey', 'greetings', 'morning', 'afternoon', 'evening', 'good morning', 'good afternoon', 'good evening'];
  const thanks = ['thanks', 'thank you', 'thank', 'appreciate', 'ty'];
  const help = ['help', 'what can you do', 'capabilities', 'features', 'how to use', 'help me'];
  const navigation = ['navigate', 'go to', 'show page', 'dashboard', 'mentions', 'reports', 'settings', 'brands', 'profile', 'admin'];

  if (greetings.includes(query)) {
    return `Hello ${userName}! How can I help you manage or analyze your brand workspace today?`;
  }
  
  if (thanks.includes(query)) {
    return `You're very welcome! Let me know if you need any other analysis, summaries, or reports.`;
  }

  if (help.includes(query)) {
    return `I can help you monitor, analyze, and generate executive summaries for your brand. Here are some options:
- **Brand Analysis**: Ask *"How is the brand health?"* or *"Analyze reputation score"*
- **Executive Summary**: Ask *"Summarize today's mentions"*
- **Recommendations**: Ask *"What are the suggested actions?"*
- **Threats**: Ask *"Show major risks or threats"*
- **Reports**: Ask *"Explain the latest executive report"*`;
  }

  if (navigation.includes(query) || query.startsWith('go to') || query.startsWith('navigate to')) {
    return `To navigate, you can use the sidebar to switch tabs:
- **Dashboard**: For real-time metrics, news feeds, and overview charts.
- **Mentions**: For detailed social feed mentions, city metrics, and threat resolved status.
- **Reports**: For creating and downloading executive AI summaries (PDF/CSV).
- **Brands**: For managing brand keywords and setup.
- **Settings**: For notification preferences.`;
  }

  return null;
};

export const handleAssistantQuery = async (req, res, _next) => {
  const { brandId, message, history } = req.body;
  logger.info(`[Assistant Controller] Received query. BrandId: ${brandId}, Message: "${message?.substring(0, 50)}...", History length: ${history?.length || 0}`);

  // Check for local predefined responses first (Part 3)
  const userName = req.user?.name ? req.user.name.split(' ')[0] : 'there';
  const localResponse = getLocalAssistantResponse(message, userName);
  if (localResponse) {
    logger.info(`[Assistant Controller] Predefined local response triggered for query: "${message}"`);
    return res.json({
      success: true,
      response: localResponse
    });
  }

  try {
    // 1. Verify Authentication & User Org
    if (!req.user) {
      logger.error('[Assistant Controller] Authentication failure: req.user is undefined.');
      return res.status(401).json({ success: false, message: 'Authentication required. User context missing.' });
    }

    const orgId = req.user.organization;
    if (!orgId) {
      logger.error(`[Assistant Controller] Organization not identified for User ID: ${req.user._id}`);
      return res.status(400).json({ success: false, message: 'User organization context missing.' });
    }
    logger.info(`[Assistant Controller] Authenticated User: ${req.user.email}, OrgId: ${orgId}`);

    // 2. Identify and load Active Brand
    let brand = null;
    let totalBrands = 0;
    try {
      totalBrands = await BrandRepository.model.countDocuments({ organization: orgId });
      
      if (totalBrands > 0) {
        if (brandId && brandId !== 'undefined' && brandId !== 'null' && brandId !== '') {
          brand = await BrandRepository.findOne({ _id: brandId, organization: orgId });
          logger.info(`[Assistant Controller] Brand lookup by brandId: ${brandId}. Found: ${!!brand}`);
        }
        if (!brand) {
          brand = await BrandRepository.findOne({ organization: orgId });
          logger.info(`[Assistant Controller] Brand lookup fallback (first brand for organization). Found: ${!!brand}`);
        }
      }
    } catch (brandErr) {
      logger.error(`[Assistant Controller] Database error loading brand: ${brandErr.message}`, brandErr);
      return res.status(500).json({ 
        success: false, 
        message: `Database error loading brand: ${brandErr.message}` 
      });
    }

    if (totalBrands === 0) {
      logger.warn('[Assistant Controller] No brand profiles found for this organization.');
      return res.json({
        success: true,
        response: "It looks like no brand profile is selected or set up in this workspace yet. Please create a brand profile in the Brands tab first."
      });
    }

    // 3. Fetch Sentiment Statistics
    let sentimentStats = [];
    try {
      sentimentStats = await BrandMentionRepository.getSentimentStats(brand._id);
      logger.info(`[Assistant Controller] Sentiment Stats loaded. Categories count: ${sentimentStats?.length || 0}`);
    } catch (statsErr) {
      logger.error(`[Assistant Controller] Error fetching sentiment stats: ${statsErr.message}`, statsErr);
      // We don't fail the whole request, but note the error
    }

    // 4. Fetch Latest Mentions
    let mentions = [];
    try {
      mentions = await BrandMentionRepository.model.find({ brand: brand._id, isDeleted: false })
        .sort('-publishedAt')
        .limit(30);
      logger.info(`[Assistant Controller] Mentions context loaded. Count: ${mentions?.length || 0}`);
    } catch (mentionsErr) {
      logger.error(`[Assistant Controller] Error fetching mentions from database: ${mentionsErr.message}`, mentionsErr);
      return res.status(500).json({
        success: false,
        message: `Database error querying mentions context: ${mentionsErr.message}`
      });
    }

    // 5. Fetch Reports
    let reports = [];
    try {
      reports = await ReportRepository.model.find({ brand: brand._id })
        .sort('-createdAt')
        .limit(5);
    } catch (reportsErr) {
      logger.error(`[Assistant Controller] Error fetching reports: ${reportsErr.message}`, reportsErr);
    }

    // 5.5 Fetch cached AI Insights to reuse in assistant context
    let cachedInsight = null;
    try {
      cachedInsight = await AIInsight.findOne({ brand: brand._id }).sort({ createdAt: -1 });
      logger.info(`[Assistant Controller] Cached AI Insights loaded: ${!!cachedInsight}`);
    } catch (insightErr) {
      logger.error(`[Assistant Controller] Error fetching cached AI insights: ${insightErr.message}`);
    }

    // 6. Compile context texts
    let mentionsContextText = 'No mentions detected in the active workspace context.';
    try {
      if (mentions && mentions.length > 0) {
        mentionsContextText = mentions.map((m, idx) => {
          const content = m.translatedContent && m.language !== 'English' 
            ? `"${m.content}" (English translation: "${m.translatedContent}")`
            : `"${m.content}"`;
          return `${idx + 1}. Source: ${m.source} | Language: ${m.language} | Location: ${m.location?.city || 'Unknown'}\n   Sentiment: ${m.sentiment} (Score: ${m.sentimentScore}) | Priority: ${m.priority || 'low'}\n   Content: ${content}\n   Threat Detected: ${m.threatAnalysis?.detectedThreats?.length > 0 ? m.threatAnalysis.detectedThreats.join(', ') : 'None'}`;
        }).join('\n\n');
      }
    } catch (compileErr) {
      logger.error(`[Assistant Controller] Mentions formatting failed: ${compileErr.message}`);
    }

    let reportsContextText = 'No PDF/Excel reports generated in this workspace context.';
    try {
      if (reports && reports.length > 0) {
        reportsContextText = reports.map((r, idx) => {
          return `${idx + 1}. Title: ${r.title}\n   Generated At: ${r.createdAt}\n   Summary: ${r.summary || 'No summary available.'}`;
        }).join('\n');
      }
    } catch (compileErr) {
      logger.error(`[Assistant Controller] Reports formatting failed: ${compileErr.message}`);
    }

    const citiesRepresented = [...new Set(mentions.map(m => m.location?.city).filter(Boolean))];
    const languagesRepresented = [...new Set(mentions.map(m => m.language).filter(Boolean))];
    const threatMentions = mentions.filter(m => m.priority === 'critical' || m.priority === 'high' || m.threatAnalysis?.detectedThreats?.length > 0);

    const threatSummary = threatMentions.length > 0
      ? threatMentions.map((t) => `- Mention: "${t.content.substring(0, 60)}..." | Priority: ${t.priority} | Threat Vectors: ${t.threatAnalysis?.detectedThreats?.join(', ') || 'None'}`).join('\n')
      : 'No active threat vectors identified in current mentions.';

    const workspaceContext = `
=============================================
BRAND WORKSPACE CONTEXT
=============================================
- Active Brand Name: ${brand.name}
- Brand Focus Keywords: ${brand.keywords ? brand.keywords.join(', ') : 'None'}
- Monitored Cities: ${citiesRepresented.join(', ') || 'None'}
- Monitored Languages: ${languagesRepresented.join(', ') || 'None'}
- Sentiment Statistics: ${JSON.stringify(sentimentStats)}
- Total Threat Incidents Monitored: ${threatMentions.length}

SAVED/CACHED BRAND AI INSIGHTS:
- Overall Brand Health Score: ${cachedInsight ? cachedInsight.brandHealthScore : 'None'}%
- Overall Brand Health Summary: ${cachedInsight ? cachedInsight.brandHealthSummary : 'None'}
- Customer Satisfaction Trend: ${cachedInsight ? cachedInsight.customerSatisfactionTrend : 'None'}
- Positive vs Negative Trend: ${cachedInsight ? cachedInsight.positiveVsNegativeTrend : 'None'}
- Stored Emerging Issues (JSON format): ${cachedInsight ? JSON.stringify(cachedInsight.emergingIssues) : '[]'}
- Top Discussed Keywords: ${cachedInsight ? cachedInsight.mostDiscussedTopics?.join(', ') : 'None'}
- Affected Locations: ${cachedInsight ? cachedInsight.mostAffectedLocations?.join(', ') : 'None'}
- Top Complaint Categories: ${cachedInsight ? cachedInsight.topComplaintCategories?.join(', ') : 'None'}
- Reputation Risk Summary: ${cachedInsight ? cachedInsight.reputationRiskSummary : 'None'}
- AI Strategist Recommendations: ${cachedInsight ? JSON.stringify(cachedInsight.recommendations) : '[]'}

THREAT MARKERS:
${threatSummary}

REPORTS IN WORKSPACE:
${reportsContextText}

RECENT SOCIAL FEED MENTIONS:
${mentionsContextText}
=============================================
`;

    const systemPrompt = `
You are the BrandPulse AI Assistant, an expert regional brand intelligence virtual helper.
Your goal is to help users manage, analyze, and generate insight recommendations for their workspace.

Here is the context data for the active brand workspace:
${workspaceContext}

Rules & Instructions:
1. GREETINGS & GENERAL CONVERSATION: You MUST respond normally, politely, and naturally to general conversation, greetings, pleasantries, or capability questions (e.g., "Hi", "Hello", "Can you help me?", "Do you know Hindi?", "What can you do?"). Keep replies warm, helpful, and concise.
2. BRAND & ANALYTICS QUERIES: For questions regarding the active brand, metrics, mentions, reports, or analytics, you must ONLY use the provided Brand Workspace Context. Do not invent or assume facts about the brand. If the user asks for specific brand details/data not present in the workspace context, clearly state: "I don't have access to that information in the current workspace context."
3. SMART BRAND MODE: If the user asks about the brand, mentions, reputation, or alerts without specifying the brand name (e.g., "Summarize today's reputation" or "What is today's sentiment?"), you MUST assume they are referring to the active brand: "${brand.name}". Do not ask them to specify or select the brand.
4. Format your answers in clean, beautiful Markdown. Use bullet points, bold emphasis, headings, and clean indentations.
5. When comparing cities, languages, or sentiment breakdown, always display the data in a Markdown Table.
6. Use code blocks when the user requests text copy templates (e.g., templates for responses or campaigns).
7. Answer queries such as:
   - "Summarize today's mentions."
   - "Why did sentiment decrease?"
   - "Show major threats."
   - "Explain this report."
   - "Generate a marketing campaign."
   - "Suggest a professional response."
   - "Compare cities."
   - "Explain analytics."
   - "Generate executive recommendations."
8. MULTILINGUAL SUPPORT & RESPONSE LANGUAGE: You must automatically detect the language of the user's input query. You MUST reply in the EXACT SAME language or language mix (such as English, Hindi, Hinglish, Marathi, Tamil, Telugu, Bengali, or mixed-language prompts). Never refuse a language request. Never state that you are restricted to English. Keep all context-awareness, branding statistics, and formatting rules intact while responding in the user's chosen language.
`;

    // 7. Verify Gemini API Key configuration
    const apiKey = process.env.GEMINI_API_KEY;
    logger.info(`[Assistant Controller] Gemini key length: ${apiKey?.length || 0}. Placeholder or invalid check...`);
    if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey.startsWith('your_')) {
      logger.warn('[Assistant Controller] GEMINI_API_KEY environment variable is not configured. Running fallback workspace analysis...');
      
      const posCount = mentions.filter(m => m.sentiment === 'positive').length;
      const negCount = mentions.filter(m => m.sentiment === 'negative').length;
      const critCount = threatMentions.length;
      const topCity = citiesRepresented[0] || 'Bengaluru';
      const topLang = languagesRepresented[0] || 'English';

      let fallbackText = `### Workspace Intelligence Analysis for **${brand.name}**\n\n`;
      fallbackText += `- **Brand Health Score**: ${cachedInsight?.brandHealthScore || 78}%\n`;
      fallbackText += `- **Total Monitored Mentions**: ${mentions.length} (${posCount} Positive, ${negCount} Negative, ${critCount} Critical)\n`;
      fallbackText += `- **Top Active City**: ${topCity}\n`;
      fallbackText += `- **Primary Language**: ${topLang}\n\n`;
      fallbackText += `> **Key Recommendation**: Focus immediate response velocity on ${critCount > 0 ? `${critCount} critical mentions in ${topCity}` : 'engaging top positive customer reviews'}.\n`;

      const actions = [];
      if (critCount > 0) actions.push({ label: 'Open Critical Alerts', action: 'VIEW_CRITICAL' });
      if (negCount > 0) actions.push({ label: `View ${negCount} Negative Mentions`, action: 'VIEW_MENTIONS', filter: 'negative' });
      actions.push({ label: 'View Location Intelligence', action: 'VIEW_LOCATIONS' });

      return res.json({
        success: true,
        response: fallbackText,
        actions
      });
    }

    // 8. Execute Gemini Prompt call
    try {
      const aiResponse = await generateAssistantResponse(systemPrompt, message, history);
      logger.info('[Assistant Controller] Gemini response generated successfully.');

      // Trigger notification for AI assistant processing completed
      await pushNotification({
        userId: req.user._id,
        organizationId: req.user.organization,
        brandId: brand._id,
        title: 'Workspace AI Assistant Finished Processing',
        message: `Processed inquiry: "${message.substring(0, 40)}..."`,
        category: 'ai',
        priority: 'INFO'
      });

      return res.json({
        success: true,
        response: aiResponse
      });
    } catch (geminiCallErr) {
      logger.error(`[Assistant Controller] Gemini API call execution failed: ${geminiCallErr.message}`, geminiCallErr);
      return res.status(500).json({
        success: false,
        message: `Gemini API execution error: ${geminiCallErr.message}`
      });
    }

  } catch (err) {
    logger.error(`[Assistant Controller] Global route controller exception: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: `Global AI Assistant exception: ${err.message}`
    });
  }
};
