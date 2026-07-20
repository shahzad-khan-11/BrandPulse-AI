import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Brand from '../models/Brand.js';
import BrandMention from '../models/BrandMention.js';
import WorkflowLog from '../models/WorkflowLog.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { createBrand } from '../controllers/brandController.js';
import logger from '../config/logger.js';

const runVerification = async () => {
  logger.info('==================================================');
  logger.info('Starting Live Pipeline Verification Script');
  logger.info('==================================================');

  await connectDB();

  try {
    // 1. Get or create test organization
    let org = await Organization.findOne({ slug: 'acme-enterprises' });
    if (!org) {
      org = await Organization.create({
        name: 'Acme Enterprises',
        slug: 'acme-enterprises',
        billingTier: 'growth',
      });
    }

    // 2. Get or create test user
    let user = await User.findOne({ email: 'admin@acme.com' });
    if (!user) {
      user = await User.create({
        name: 'Acme Administrator',
        email: 'admin@acme.com',
        password: 'password123',
        role: 'admin',
        organization: org._id,
      });
    }

    const testBrands = ['Google', 'YouTube', 'Amazon', 'Microsoft', 'OpenAI'];
    const results = [];

    for (let idx = 0; idx < testBrands.length; idx++) {
      const brandName = testBrands[idx];
      logger.info(`\n[Test brand: ${brandName}] Cleaning old records...`);
      const existingBrand = await Brand.findOne({ name: brandName, organization: org._id });
      if (existingBrand) {
        await BrandMention.deleteMany({ brand: existingBrand._id });
        await WorkflowLog.deleteMany({ brand: existingBrand._id });
        await Brand.deleteOne({ _id: existingBrand._id });
      }

      logger.info(`Creating brand: ${brandName}...`);
      let responseCode = null;
      let responseData = null;

      const mockReq = {
        body: { name: brandName, keywords: [brandName.toLowerCase()] },
        user: { organization: org._id, _id: user._id },
      };

      const mockRes = {
        status: (code) => {
          responseCode = code;
          return {
            json: (data) => {
              responseData = data;
            },
          };
        },
        json: (data) => {
          responseData = data;
        },
      };

      await createBrand(mockReq, mockRes, (err) => {
        if (err) logger.error(`Controller error for ${brandName}:`, err);
      });

      // Verification checkpoints status
      let brandCreated = false;
      let mentionsGenerated = false;
      let geminiExecuted = false;
      let aiAnalysisStored = false;
      let workflowLogCreated = false;
      let automationHealthy = false;

      // Check immediate brand creation response
      if (responseData && responseData.success) {
        brandCreated = true;
      }

      // Wait 10 seconds to let the sequential background worker complete its Gemini calls safely (with 1.2s delay between templates)
      logger.info('Waiting 10 seconds for sequential background Gemini AI pipeline tasks to complete...');
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Re-fetch the brand details and background outputs
      const brandDoc = await Brand.findOne({ name: brandName, organization: org._id });
      if (brandDoc) {
        brandCreated = true;

        // Verify Mentions
        const mentions = await BrandMention.find({ brand: brandDoc._id });
        if (mentions.length > 0) {
          mentionsGenerated = true;

          // Check if Gemini executed (not using mock fallbacks)
          const validGeminiMentions = mentions.filter(m => {
            const hasSummary = m.summary && !m.summary.includes('Fallback') && !m.summary.includes('fallback');
            const hasAiAnalysis = m.aiAnalysis && m.aiAnalysis.keyThemes && m.aiAnalysis.keyThemes.length > 0;
            return hasSummary && hasAiAnalysis;
          });
          
          if (validGeminiMentions.length > 0) {
            geminiExecuted = true;
            aiAnalysisStored = true;
          }
        }

        // Verify WorkflowLog
        const logs = await WorkflowLog.find({ brand: brandDoc._id });
        if (logs.length > 0) {
          workflowLogCreated = true;
          
          const completedLog = logs.find(l => l.status === 'completed');
          if (completedLog) {
            automationHealthy = true;
          }
        }
      }

      results.push({
        brand: brandName,
        brandCreated: brandCreated ? 'PASS' : 'FAIL',
        mentionsGenerated: mentionsGenerated ? 'PASS' : 'FAIL',
        geminiExecuted: geminiExecuted ? 'PASS' : 'FAIL',
        aiAnalysisStored: aiAnalysisStored ? 'PASS' : 'FAIL',
        workflowLogCreated: workflowLogCreated ? 'PASS' : 'FAIL',
        automationHealthy: automationHealthy ? 'PASS' : 'FAIL',
      });

      // Wait 15 seconds after each brand checks (except the last one) to allow the 5 RPM rate limit window to reset
      if (idx < testBrands.length - 1) {
        logger.info('Throttling test runner: Waiting 15 seconds for Gemini API rate limits to reset...');
        await new Promise((resolve) => setTimeout(resolve, 15000));
      }
    }

    logger.info('\n==================================================');
    logger.info('PIPELINE VERIFICATION RESULTS TABLE');
    logger.info('==================================================');
    console.table(results);

    // Print raw markdown table format for final report
    console.log('\n### Verification Status Matrix');
    console.log('| Brand | Brand Created | Mentions Generated | Gemini Executed | AI Analysis Stored | WorkflowLog Created | Automation Status |');
    console.log('|---|---|---|---|---|---|---|');
    results.forEach(r => {
      console.log(`| **${r.brand}** | ${r.brandCreated} | ${r.mentionsGenerated} | ${r.geminiExecuted} | ${r.aiAnalysisStored} | ${r.workflowLogCreated} | ${r.automationHealthy} |`);
    });

  } catch (error) {
    logger.error('Verification script failed:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('\nDatabase connection closed.');
  }
};

runVerification();
