import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import BrandMention from '../../models/BrandMention.js';
import { analyzeRegionalContent } from '../../services/aiService.js';
import { analyzeMentionThreats } from '../../services/threatService.js';
import logger from '../../config/logger.js';

/**
 * Checks if a mention record currently contains fallback AI analysis.
 * Fallback indicators include:
 * - Specific fallback explanation string
 * - "Keyword Analysis" or "Regional Language Detection" in key themes
 * - "Monitor sentiment trends." or "Identify and address issues immediately." as suggested action
 * - Empty or missing AI analysis
 */
const isFallbackMention = (mention) => {
  if (!mention.aiAnalysis) return true;
  const explanation = mention.aiAnalysis.explanation || '';
  const keyThemes = mention.aiAnalysis.keyThemes || [];
  const suggestedAction = mention.aiAnalysis.suggestedAction || '';
  
  return (
    explanation.includes('Keyword-based fallback analysis') ||
    keyThemes.includes('Keyword Analysis') ||
    keyThemes.includes('Regional Language Detection') ||
    suggestedAction === 'Monitor sentiment trends.' ||
    suggestedAction === 'Identify and address issues immediately.' ||
    explanation === ''
  );
};

const runMigration = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing in the environment config.');
    process.exit(1);
  }

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  try {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB for one-time fallback mentions migration.');

    // 1. Perform a single Gemini API health check.
    logger.info('Performing Gemini API health check...');
    const testContent = "Test message for API health check";
    const healthAnalysis = await analyzeRegionalContent(testContent);
    if (
      !healthAnalysis ||
      !healthAnalysis.aiAnalysis ||
      !healthAnalysis.aiAnalysis.explanation ||
      healthAnalysis.aiAnalysis.explanation.includes('Keyword-based fallback analysis')
    ) {
      logger.error('Gemini API health check FAILED. API is unavailable, key is invalid, or quota is exhausted.');
      logger.error('STOPPING migration immediately without modifying any database records.');
      await mongoose.disconnect();
      return;
    }
    logger.info('Gemini API health check passed. Continuing with migration...');

    // Fetch all mentions to scan
    const mentions = await BrandMention.find({});
    totalScanned = mentions.length;
    logger.info(`Total mentions found in database to scan: ${totalScanned}`);

    for (const mention of mentions) {
      // 7. Before updating each record, verify it still contains fallback values.
      if (!isFallbackMention(mention)) {
        totalSkipped++;
        logger.info(`Mention ID ${mention._id}: Skipped - Reason: Already contains valid Gemini analysis.`);
        continue;
      }

      logger.info(`Mention ID ${mention._id}: Scanned - Found fallback values. Initiating AI evaluation...`);

      try {
        // Call regional content analysis
        const analysis = await analyzeRegionalContent(mention.content);

        // 8. If Gemini quota is exhausted or the API call fails, SKIP that record and continue.
        if (
          analysis.aiAnalysis &&
          analysis.aiAnalysis.explanation &&
          analysis.aiAnalysis.explanation.includes('Keyword-based fallback analysis')
        ) {
          totalFailed++;
          logger.warn(`Mention ID ${mention._id}: Failed - Reason: Gemini API call returned fallback response (quota likely exhausted).`);
          continue;
        }

        // Call threat analysis service
        const threatInfo = await analyzeMentionThreats(mention.content, analysis.sentiment);

        // Update mention document
        mention.sentiment = analysis.sentiment;
        mention.sentimentScore = analysis.sentimentScore;
        mention.language = analysis.language;
        mention.confidence = analysis.confidence;
        mention.emotion = analysis.emotion;
        mention.summary = analysis.summary;
        mention.aiAnalysis = analysis.aiAnalysis;
        
        mention.priority = threatInfo.priority;
        mention.threatAnalysis = {
          detectedThreats: threatInfo.detectedThreats,
          explanation: threatInfo.explanation
        };

        await mention.save();
        totalUpdated++;
        logger.info(`Mention ID ${mention._id}: Success - Reason: Re-evaluated with Gemini AI successfully.`);

      } catch (err) {
        totalFailed++;
        logger.error(`Mention ID ${mention._id}: Failed - Reason: Error during AI evaluation: ${err.message}`);
      }

      // Respect rate limits by sleeping 30 seconds between records to stay under 5 RPM
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }

    console.log('\n======================================');
    console.log('      MIGRATION RUNNER SUMMARY');
    console.log('======================================');
    console.log(`Total scanned:  ${totalScanned}`);
    console.log(`Total updated:  ${totalUpdated}`);
    console.log(`Total skipped:  ${totalSkipped}`);
    console.log(`Total failed:   ${totalFailed}`);
    console.log('======================================\n');

  } catch (error) {
    logger.error('Migration script encountered a critical error:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Database connection closed.');
  }
};

runMigration();
