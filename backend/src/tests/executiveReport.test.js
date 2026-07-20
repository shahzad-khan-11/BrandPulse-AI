import { calculateReportStats, generateReportSummaryFallback } from '../services/reportService.js';
import logger from '../config/logger.js';

const runTests = async () => {
  logger.info('==================================================');
  logger.info('Starting Executive Intelligence Reports Tests');
  logger.info('==================================================');

  let passed = 0;
  let failed = 0;

  // Mock list of mentions
  const mockMentions = [
    {
      content: 'Major system outage today. Critical database timeout error!',
      sentiment: 'negative',
      priority: 'critical',
      location: { city: 'Kolkata', state: 'West Bengal' }
    },
    {
      content: 'I love this product, it works perfectly and is fast.',
      sentiment: 'positive',
      priority: 'low',
      location: { city: 'Patna', state: 'Bihar' }
    },
    {
      content: 'Standard shipping took 3 days. Average service.',
      sentiment: 'neutral',
      priority: 'medium',
      location: { city: 'Patna', state: 'Bihar' }
    }
  ];

  logger.info('Running Test Case: [Calculating Report stats]');
  const stats = calculateReportStats(mockMentions);

  const totalMatch = stats.totalMentions === 3;
  const healthValid = stats.brandHealthScore >= 0 && stats.brandHealthScore <= 100;
  const locationValid = stats.locationDistribution['Patna'] === 2 && stats.locationDistribution['Kolkata'] === 1;

  if (totalMatch && healthValid && locationValid) {
    logger.info(`✅ PASS: Stats calculated correctly. Health score: ${stats.brandHealthScore}.`);
    passed++;
  } else {
    logger.error('❌ FAIL: Invalid stats calculations.');
    failed++;
  }

  logger.info('Running Test Case: [Generating AI summary fallback]');
  const summary = generateReportSummaryFallback(stats, mockMentions);

  const hasSummary = summary.brandHealthSummary.length > 0;
  const hasRecommendations = summary.recommendations.length > 0;

  if (hasSummary && hasRecommendations) {
    logger.info(`✅ PASS: Fallback summary generated successfully with ${summary.recommendations.length} recommendations.`);
    passed++;
  } else {
    logger.error('❌ FAIL: Invalid summary details.');
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
