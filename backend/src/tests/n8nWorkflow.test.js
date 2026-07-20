import { resolveLocationForMention } from '../services/locationService.js';
import { analyzeMentionThreats } from '../services/threatService.js';
import { calculateReportStats } from '../services/reportService.js';
import { analyzeRegionalContent } from '../services/aiService.js';
import logger from '../config/logger.js';

const runTests = async () => {
  logger.info('==================================================');
  logger.info('Starting n8n Agentic Automation Integration Tests');
  logger.info('==================================================');

  let passed = 0;
  let failed = 0;

  // 1. Language Detection Test (used by Webhook)
  logger.info('Running Test Case: [Language Detection]');
  const langResult = await analyzeRegionalContent('খুব সুন্দর সার্ভিস!'); // Bengali
  if (langResult.language === 'Bengali') {
    logger.info(`✅ PASS: Detected language: ${langResult.language}`);
    passed++;
  } else {
    logger.error(`❌ FAIL: Expected Bengali, got ${langResult.language}`);
    failed++;
  }

  // 2. Hyperlocal Location Test (used by Webhook)
  logger.info('Running Test Case: [Hyperlocal Location Resolution]');
  const locResult = resolveLocationForMention(
    'पटना में नया लॉन्च इवेंट।',
    'Hindi',
    'reddit'
  );
  if (locResult.city === 'Patna' && locResult.state === 'Bihar') {
    logger.info(`✅ PASS: Resolved hyperlocal location to: ${locResult.city}, ${locResult.state}`);
    passed++;
  } else {
    logger.error(`❌ FAIL: Expected Patna, got ${locResult.city}`);
    failed++;
  }

  // 3. Threat Assessment Test (used by Webhook)
  logger.info('Running Test Case: [Threat Level Detection]');
  const threatResult = await analyzeMentionThreats(
    'Outage error! Complete server crash breach security!',
    'negative'
  );
  if (threatResult.priority === 'critical') {
    logger.info(`✅ PASS: Classified priority correctly: ${threatResult.priority}`);
    passed++;
  } else {
    logger.error(`❌ FAIL: Expected critical priority, got ${threatResult.priority}`);
    failed++;
  }

  // 4. Metrics Aggregates Statistics Test (used by Webhook)
  logger.info('Running Test Case: [Report Stats Calculation]');
  const mockMentions = [
    { sentiment: 'positive', priority: 'low', location: { city: 'Bengaluru' }, language: 'English', source: 'twitter' },
    { sentiment: 'negative', priority: 'critical', location: { city: 'Kolkata' }, language: 'Bengali', source: 'web' }
  ];
  const stats = calculateReportStats(mockMentions);
  if (stats.totalMentions === 2 && stats.brandHealthScore === 50) {
    logger.info(`✅ PASS: Stats computed correctly. Health Score: ${stats.brandHealthScore}`);
    passed++;
  } else {
    logger.error(`❌ FAIL: Invalid stats computation: ${JSON.stringify(stats)}`);
    failed++;
  }

  logger.info('==================================================');
  logger.info(`Tests Completed: ${passed} Passed, ${failed} Failed`);
  logger.info('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
