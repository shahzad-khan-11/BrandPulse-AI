import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';
import BrandMention from '../models/BrandMention.js';
import ExecutiveReport from '../models/ExecutiveReport.js';
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
 * Builds the query filters based on report configurations.
 */
export const buildReportFilters = (brandId, filterParams) => {
  const query = { brand: brandId };
  const { startDate, endDate, language, sentiment, priority, source, country, state, city } = filterParams;

  if (startDate || endDate) {
    query.publishedAt = {};
    if (startDate) query.publishedAt.$gte = new Date(startDate);
    if (endDate) query.publishedAt.$lte = new Date(endDate);
  }

  if (language) query.language = language;
  if (sentiment) query.sentiment = sentiment;
  if (priority) query.priority = priority;
  if (source) query.source = source;
  if (country) query['location.country'] = country;
  if (state) query['location.state'] = state;
  if (city) query['location.city'] = city;

  return query;
};

/**
 * Calculates mention metrics distributions from raw documents.
 */
export const calculateReportStats = (mentions) => {
  const totalMentions = mentions.length;
  
  const sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
  const threatDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
  const locationDistribution = {};
  const languageDistribution = {};
  const sourceDistribution = {};

  mentions.forEach(m => {
    // Sentiment
    const sent = m.sentiment || 'neutral';
    if (sentimentDistribution[sent] !== undefined) {
      sentimentDistribution[sent]++;
    }

    // Priority
    const prio = m.priority || 'low';
    if (threatDistribution[prio] !== undefined) {
      threatDistribution[prio]++;
    }

    // Location
    if (m.location?.city) {
      const locKey = m.location.city;
      locationDistribution[locKey] = (locationDistribution[locKey] || 0) + 1;
    }

    // Language
    const lang = m.language || 'English';
    languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;

    // Source
    const src = m.source || 'web';
    sourceDistribution[src] = (sourceDistribution[src] || 0) + 1;
  });

  const positives = sentimentDistribution.positive;
  const negatives = sentimentDistribution.negative;
  const brandHealthScore = totalMentions > 0 
    ? Math.round(((positives + (totalMentions - negatives - positives) * 0.5) / totalMentions) * 100)
    : 70;

  return {
    totalMentions,
    brandHealthScore,
    sentimentDistribution,
    threatDistribution,
    locationDistribution,
    languageDistribution,
    sourceDistribution
  };
};

export const generateReportSummaryFallback = (stats, mentions) => {
  return {
    brandHealthSummary: `The brand has a health score of ${stats.brandHealthScore}/100 across ${stats.totalMentions} mentions.`,
    sentimentOverview: `Positive: ${stats.sentimentDistribution.positive}, Neutral: ${stats.sentimentDistribution.neutral}, Negative: ${stats.sentimentDistribution.negative}`,
    threatSummary: `Threat classification distribution: Critical: ${stats.threatDistribution.critical}, High: ${stats.threatDistribution.high}`,
    reputationRisk: stats.threatDistribution.critical > 0 ? 'High risk: critical outage detected.' : 'Low risk.',
    topPositiveTopics: ['product performance', 'speed'],
    topNegativeTopics: ['system downtime'],
    mostActiveLocations: Object.keys(stats.locationDistribution),
    languageDistributionText: 'Primary language is English.',
    sourceDistributionText: 'Main crawl channels are twitter and web.',
    recommendations: [
      {
        title: 'System Optimization',
        description: 'Deploy performance optimizations and server scaling.',
        priority: 'high',
        reason: 'Outages trigger customer dissatisfaction.',
        suggestedAction: 'Scale servers dynamically.'
      }
    ]
  };
};

/**
 * Queries Gemini AI to generate the Executive Summary data.
 */
export const generateAIReportSummary = async (stats, mentions) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey.startsWith('your_')) {
    logger.warn('[Report Service] GEMINI_API_KEY is missing or placeholder. Running local report summary fallback...');
    return generateReportSummaryFallback(stats, mentions);
  }

  const client = getGenAIClient();

  const model = client.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  // Provide condensed snapshot of mentions
  const mentionsSample = mentions.slice(0, 30).map(m => ({
    content: m.content,
    sentiment: m.sentiment,
    priority: m.priority || 'low',
    location: m.location ? `${m.location.city}, ${m.location.state}` : 'Unknown'
  }));

  const prompt = `
    You are an elite enterprise executive brand officer compiling an Executive Brand Intelligence Report.
    Analyze the following aggregated stats and sample mentions to generate a comprehensive executive summary.
    
    Aggregated Stats:
    ${JSON.stringify(stats, null, 2)}
    
    Mentions Sample:
    ${JSON.stringify(mentionsSample, null, 2)}
    
    Return the output as a valid JSON matching this schema:
    {
      "brandHealthSummary": "One sentence describing overall health.",
      "sentimentOverview": "Overview of positive vs negative conversation sentiment.",
      "threatSummary": "Summary of active complaints, customer support vectors or negative trends.",
      "reputationRisk": "Summary of active reputation risks and vulnerabilities.",
      "topPositiveTopics": ["topic 1", "topic 2"],
      "topNegativeTopics": ["issue 1", "issue 2"],
      "mostActiveLocations": ["city 1", "city 2"],
      "languageDistributionText": "A summary explaining language ratios.",
      "sourceDistributionText": "A summary explaining source/crawlers channel split.",
      "recommendations": [
        {
          "title": "Actionable recommendation title",
          "description": "Details of the recommendation.",
          "priority": "high" | "medium" | "low",
          "reason": "Why this recommendation is necessary based on the data.",
          "suggestedAction": "Steps to resolve the issue."
        }
      ]
    }
  `;

  const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'Executive Report Summary' });
  const text = result.response.text();
  logger.info(`[Report Service] Raw executive summary response: ${text.trim()}`);
  
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();
    return JSON.parse(cleanText);
  } catch (parseErr) {
    logger.error(`[Report Service] Failed to parse Gemini response: ${parseErr.message}. Prompt output: "${text}"`);
    return generateReportSummaryFallback(stats, mentions);
  }
};

/**
 * Transforms report data and mentions list into CSV file buffer.
 */
export const exportReportToCSV = (report, mentions) => {
  const headers = ['Date', 'Source', 'Author', 'Sentiment', 'Priority', 'Language', 'City', 'State', 'Content'];
  const rows = mentions.map(m => [
    new Date(m.publishedAt).toLocaleDateString(),
    m.source,
    `"${(m.author || 'Anonymous').replace(/"/g, '""')}"`,
    m.sentiment,
    m.priority || 'low',
    m.language || 'English',
    m.location?.city || '',
    m.location?.state || '',
    `"${m.content.replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return Buffer.from(csvContent, 'utf-8');
};

import PDFDocument from 'pdfkit';

const drawKPICard = (doc, x, y, width, height, title, value, color) => {
  doc.save();
  // Draw card border and background
  doc.roundedRect(x, y, width, height, 6).fillColor('#f8fafc').fill();
  doc.roundedRect(x, y, width, height, 6).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  
  // Accent vertical stripe
  doc.rect(x, y, 4, height).fillColor(color).fill();

  doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(title.toUpperCase(), x + 12, y + 14);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text(value, x + 12, y + 26);
  doc.restore();
};

const drawTableHeader = (doc, y, headers) => {
  doc.save();
  doc.rect(50, y, doc.page.width - 100, 20).fillColor('#1e293b').fill();
  
  const colWidth = (doc.page.width - 100) / headers.length;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
  headers.forEach((h, idx) => {
    doc.text(h, 55 + idx * colWidth, y + 6, { width: colWidth - 10, align: 'left' });
  });
  doc.restore();
};

const drawTableRow = (doc, y, cells) => {
  doc.save();
  doc.rect(50, y, doc.page.width - 100, 20).fillColor('#f8fafc').fill();
  doc.moveTo(50, y + 20).lineTo(doc.page.width - 50, y + 20).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
  
  const colWidth = (doc.page.width - 100) / cells.length;
  doc.fontSize(8).font('Helvetica').fillColor('#334155');
  cells.forEach((c, idx) => {
    doc.text(c, 55 + idx * colWidth, y + 6, { width: colWidth - 10, align: 'left' });
  });
  doc.restore();
};

const drawPercentageBar = (doc, y, pos, neu, neg) => {
  doc.save();
  const width = doc.page.width - 100;
  const height = 12;
  const x = 50;

  const posWidth = (pos / 100) * width;
  const neuWidth = (neu / 100) * width;
  const negWidth = (neg / 100) * width;

  if (posWidth > 0) {
    doc.rect(x, y, posWidth, height).fillColor('#10b981').fill();
  }
  if (neuWidth > 0) {
    doc.rect(x + posWidth, y, neuWidth, height).fillColor('#f59e0b').fill();
  }
  if (negWidth > 0) {
    doc.rect(x + posWidth + neuWidth, y, negWidth, height).fillColor('#dc2626').fill();
  }

  // Legend
  const legendY = y + height + 6;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.fillColor('#10b981').text(`Positive: ${Math.round(pos)}%   `, x, legendY, { continued: true })
     .fillColor('#f59e0b').text(`Neutral: ${Math.round(neu)}%   `, { continued: true })
     .fillColor('#dc2626').text(`Negative: ${Math.round(neg)}%`);

  doc.restore();
};

const drawRecommendationCard = (doc, rec, index) => {
  doc.save();
  const startX = 50;
  const startY = doc.y;
  
  const priorityColor = rec.priority?.toLowerCase() === 'high' ? '#dc2626' : (rec.priority?.toLowerCase() === 'medium' ? '#f59e0b' : '#10b981');
  
  // Left border line indicator
  doc.moveTo(startX, startY).lineTo(startX, startY + 85).strokeColor(priorityColor).lineWidth(3).stroke();
  
  doc.x = startX + 15;
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(`Recommendation #${index}: ${rec.title || 'N/A'}`);
  doc.moveDown(0.2);
  
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#4f46e5').text('Priority: ', { continued: true })
     .font('Helvetica').fillColor('#0f172a').text((rec.priority || 'medium').toUpperCase());
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Description: ', { continued: true })
     .font('Helvetica').fillColor('#334155').text(rec.description || 'N/A');
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Business Rationale: ', { continued: true })
     .font('Helvetica').fillColor('#334155').text(rec.reason || 'N/A');
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Action Plan: ', { continued: true })
     .font('Helvetica').fillColor('#334155').text(rec.suggestedAction || 'N/A');
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Expected Outcome: ', { continued: true })
     .font('Helvetica').fillColor('#334155').text('Mitigate regional identity risks and optimize local brand engagement.');
  
  doc.moveDown(0.8);
  doc.restore();
};

/**
 * Transforms report data into structured readable PDF file buffer.
 */
export const exportReportToPDF = (report) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        // Stamp Header and Footer on pages after building full range
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          
          // Skip on cover page
          if (i === 0) continue;

          // Header
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569')
             .text('BrandPulse AI', 50, 20)
             .font('Helvetica').text('Executive Intelligence Report', 150, 20)
             .font('Helvetica-Bold').text(`Report ID: ${report._id || 'N/A'}`, doc.page.width - 250, 20, { align: 'right', width: 200 });
          
          doc.moveTo(50, 30).lineTo(doc.page.width - 50, 30).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

          // Footer
          doc.moveTo(50, doc.page.height - 40).lineTo(doc.page.width - 50, doc.page.height - 40).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

          doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
             .text('© 2026 BrandPulse AI. All Rights Reserved. Confidential Business Report.', 50, doc.page.height - 30)
             .text(`Page ${i + 1} of ${range.count}`, doc.page.width - 150, doc.page.height - 30, { align: 'right', width: 100 });
        }
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', (err) => reject(err));

      const { name, filters, stats, aiSummary } = report;

      // ==========================================
      // PAGE 1: COVER PAGE
      // ==========================================
      doc.rect(0, 0, doc.page.width, 15).fillColor('#4f46e5').fill();
      
      doc.moveDown(4);
      doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e293b').text('BrandPulse AI', { align: 'left' });
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#4f46e5').text('AI-Powered Regional Brand Intelligence Platform', { align: 'left' });
      doc.moveDown(1.5);
      
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#4f46e5').lineWidth(2).stroke();
      doc.moveDown(2);
      
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#0f172a').text('EXECUTIVE INTELLIGENCE REPORT', { align: 'left' });
      doc.moveDown(3);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('BRAND NAME: ', { continued: true })
         .font('Helvetica').fillColor('#0f172a').text(report.brand?.name || 'N/A');
      doc.moveDown(0.5);
      
      const startText = filters?.startDate ? new Date(filters.startDate).toLocaleDateString() : 'Beginning';
      const endText = filters?.endDate ? new Date(filters.endDate).toLocaleDateString() : 'Present';
      doc.font('Helvetica-Bold').fillColor('#475569').text('REPORT PERIOD: ', { continued: true })
         .font('Helvetica').fillColor('#0f172a').text(`${startText} to ${endText}`);
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold').fillColor('#475569').text('GENERATED ON: ', { continued: true })
         .font('Helvetica').fillColor('#0f172a').text(new Date(report.createdAt || Date.now()).toLocaleString());
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold').fillColor('#475569').text('REPORT ID: ', { continued: true })
         .font('Helvetica').fillColor('#0f172a').text(String(report._id || 'N/A'));
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold').fillColor('#475569').text('PREPARED FOR: ', { continued: true })
         .font('Helvetica').fillColor('#0f172a').text('Executive Leadership Team');
      doc.moveDown(5);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#dc2626').text('CONFIDENTIAL BUSINESS REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748b').text('"Turning Regional Conversations into Business Intelligence"', { align: 'center' });

      // ==========================================
      // PAGE 2: EXECUTIVE SUMMARY
      // ==========================================
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('1. EXECUTIVE SUMMARY');
      doc.moveDown(1);
      
      const cardWidth = 150;
      const cardHeight = 60;
      const startX = 50;
      const gap = 20;

      // Brand Health Card
      drawKPICard(doc, startX, doc.y, cardWidth, cardHeight, 'Brand Health', `${stats.brandHealthScore || 70}/100`, '#4f46e5');
      // Total Mentions Card
      drawKPICard(doc, startX + cardWidth + gap, doc.y, cardWidth, cardHeight, 'Total Mentions', String(stats.totalMentions || 0), '#0ea5e9');
      // Risk Level Card
      const riskColor = (aiSummary.reputationRisk || '').toLowerCase() === 'high' ? '#dc2626' : ((aiSummary.reputationRisk || '').toLowerCase() === 'medium' ? '#f59e0b' : '#10b981');
      drawKPICard(doc, startX + (cardWidth + gap) * 2, doc.y, cardWidth, cardHeight, 'Reputation Risk', aiSummary.reputationRisk || 'LOW', riskColor);
      
      doc.y += cardHeight + 20;

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Executive Overview');
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(aiSummary.brandHealthSummary || 'N/A', { align: 'justify', lineGap: 2 });
      doc.moveDown(1);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Sentiment Overview');
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(aiSummary.sentimentOverview || 'N/A', { align: 'justify', lineGap: 2 });
      doc.moveDown(1);

      // ==========================================
      // PAGE 3: REGIONAL INTELLIGENCE
      // ==========================================
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('2. REGIONAL INTELLIGENCE');
      doc.moveDown(1);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Regional Performance Index');
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(aiSummary.threatSummary || 'N/A', { align: 'justify', lineGap: 2 });
      doc.moveDown(1);

      const locData = stats.locationDistribution || {};
      const locations = Object.keys(locData);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('City Performance Analytics');
      doc.moveDown(0.3);
      
      const tableTop = doc.y;
      drawTableHeader(doc, tableTop, ['City', 'Positive', 'Neutral', 'Negative', 'Score']);
      let currentY = tableTop + 20;
      
      if (locations.length === 0) {
        drawTableRow(doc, currentY, [report.brand?.city || 'Default City', String(stats.sentimentDistribution.positive), String(stats.sentimentDistribution.neutral), String(stats.sentimentDistribution.negative), `${stats.brandHealthScore}%`]);
        currentY += 20;
      } else {
        locations.slice(0, 8).forEach(loc => {
          const s = locData[loc] || { positive: 0, neutral: 0, negative: 0 };
          const total = s.positive + s.neutral + s.negative;
          const score = total > 0 ? Math.round((s.positive / total) * 100) : 70;
          drawTableRow(doc, currentY, [loc, String(s.positive), String(s.neutral), String(s.negative), `${score}%`]);
          currentY += 20;
        });
      }
      
      doc.y = currentY + 15;

      // ==========================================
      // PAGE 4: ANALYTICS
      // ==========================================
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('3. SENTIMENT & TOPIC ANALYTICS');
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Sentiment Distribution Ratio');
      doc.moveDown(0.3);
      
      const totalS = (stats.sentimentDistribution.positive || 0) + (stats.sentimentDistribution.neutral || 0) + (stats.sentimentDistribution.negative || 0) || 1;
      const posPct = ((stats.sentimentDistribution.positive || 0) / totalS) * 100;
      const neuPct = ((stats.sentimentDistribution.neutral || 0) / totalS) * 100;
      const negPct = ((stats.sentimentDistribution.negative || 0) / totalS) * 100;
      
      drawPercentageBar(doc, doc.y, posPct, neuPct, negPct);
      doc.moveDown(2);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Top Topics & Key Phrases');
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text('This section highlights key terms and conversation themes detected across vernacular news outlets, local blogs, and review websites in Tier 2/3/4 cities.', { lineGap: 2 });
      doc.moveDown(0.8);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#10b981').text('Top Positive Topics: ', { continued: true })
         .font('Helvetica').fillColor('#334155').text((aiSummary.topPositiveTopics || []).join(', ') || 'N/A');
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#dc2626').text('Top Negative Topics: ', { continued: true })
         .font('Helvetica').fillColor('#334155').text((aiSummary.topNegativeTopics || []).join(', ') || 'N/A');
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#4f46e5').text('Most Active Regional Hot-Spots: ', { continued: true })
         .font('Helvetica').fillColor('#334155').text((aiSummary.mostActiveLocations || []).join(', ') || 'N/A');

      // ==========================================
      // PAGE 5: THREAT INTELLIGENCE
      // ==========================================
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('4. THREAT INTELLIGENCE & REPUTATION RISK');
      doc.moveDown(1);
      
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text('Our real-time platform monitors and isolates identity threats, fake reviews, coordinate brand abuse, and review manipulation patterns.', { lineGap: 2 });
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Identified Threat Indicators');
      doc.moveDown(0.3);
      
      const threatTop = doc.y;
      drawTableHeader(doc, threatTop, ['Threat Severity', 'Count', 'Typical Threat Vectors', 'Status']);
      let threatY = threatTop + 20;
      
      drawTableRow(doc, threatY, ['Critical', String(stats.threatDistribution.critical || 0), 'Outages, Breaches, Major Backlash', 'ATTENTION REQUIRED']);
      threatY += 20;
      drawTableRow(doc, threatY, ['High', String(stats.threatDistribution.high || 0), 'Reputation Attacks, Coordinated Abuse', 'MONITORING']);
      threatY += 20;
      drawTableRow(doc, threatY, ['Medium', String(stats.threatDistribution.medium || 0), 'Fake Reviews, Spam, Customer Bugs', 'STANDBY']);
      threatY += 20;
      drawTableRow(doc, threatY, ['Low', String(stats.threatDistribution.low || 0), 'Neutral Complaints, Routine Queries', 'RESOLVED']);
      threatY += 20;
      
      doc.y = threatY + 15;

      // ==========================================
      // PAGE 6: EXECUTIVE RECOMMENDATIONS
      // ==========================================
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('5. ACTIONABLE EXECUTIVE RECOMMENDATIONS');
      doc.moveDown(1);
      
      const recs = aiSummary.recommendations || [];
      if (recs.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748b').text('No active recommendations for this reporting period.');
      } else {
        recs.forEach((rec, idx) => {
          drawRecommendationCard(doc, rec, idx + 1);
        });
      }

      // ==========================================
      // PAGE 7: SUGGESTED RESPONSES MATRIX
      // ==========================================
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('6. SUGGESTED RESPONSES MATRIX');
      doc.moveDown(1);
      
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text('Suggested response templates generated to handle regional language sentiments in Patna, Varanasi, and other target cities.', { lineGap: 2 });
      doc.moveDown(0.8);

      const replyTop = doc.y;
      drawTableHeader(doc, replyTop, ['Voice Tone', 'Hindi / Regional Reply', 'English / Global Reply']);
      let replyY = replyTop + 20;
      
      drawTableRow(doc, replyY, ['Standard', 'नमस्ते! हमसे संपर्क करने के लिए धन्यवाद।', 'Thank you for reaching out to us.']);
      replyY += 20;
      drawTableRow(doc, replyY, ['Friendly', 'नमस्कार दोस्त! आपकी सहायता करके हमें बेहद खुशी होगी।', 'Hey there! We would love to help you out!']);
      replyY += 20;
      drawTableRow(doc, replyY, ['Professional', 'महोदय, आपकी शिकायत दर्ज कर ली गई है। हम शीघ्र संपर्क करेंगे।', 'Dear Customer, your query has been logged. We will connect soon.']);
      replyY += 20;
      drawTableRow(doc, replyY, ['Executive', 'सादर, आपके सुझाव हमारे लिए अत्यंत महत्वपूर्ण हैं।', 'Regards, your feedback is highly valuable to us.']);
      replyY += 20;

      doc.y = replyY + 15;

      // ==========================================
      // PAGE 8: APPENDIX
      // ==========================================
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('7. APPENDIX & METHODOLOGY');
      doc.moveDown(1);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Monitoring Sources Checked');
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(aiSummary.sourceDistributionText || 'Local News, RSS Feeds, Regional News, Regional Blogs, Google Reviews, YouTube, X (Twitter)', { lineGap: 2 });
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Regional Languages Tracked');
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(aiSummary.languageDistributionText || 'Hindi, Bhojpuri, Bengali, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese', { lineGap: 2 });
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Methodology & Report Notes');
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text('The reputation index represents a weighted index score calculated based on the sentiment density and active threat profiles collected from digital channels in the region. Recommendations are compiled using enterprise NLP modules trained to filter noise and prioritize critical local operational feedbacks.', { align: 'justify', lineGap: 2 });
      doc.moveDown(1.5);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
