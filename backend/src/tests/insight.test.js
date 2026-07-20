import { generateInsightFallback } from '../services/insightService.js';
import logger from '../config/logger.js';

const runTests = async () => {
  logger.info('==================================================');
  logger.info('Starting AI Insights & Smart Recommendation Tests');
  logger.info('==================================================');

  let passed = 0;
  let failed = 0;

  // Mock list of mentions
  const mockMentions = [
    {
      content: 'Server outage causing critical downtime. Need bug fix ASAP!',
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
      content: 'Slow loading speeds on login page.',
      sentiment: 'negative',
      priority: 'high',
      location: { city: 'Kolkata', state: 'West Bengal' }
    }
  ];

  logger.info('Running Test Case: [Generating insights from 3 mentions]');
  const result = generateInsightFallback(mockMentions);

  const scoreValid = result.brandHealthScore >= 0 && result.brandHealthScore <= 100;
  const recommendationsCount = result.recommendations.length > 0;
  const riskDefined = result.reputationRiskSummary.length > 0;

  if (scoreValid && recommendationsCount && riskDefined) {
    logger.info(`✅ PASS: Calculated Health Score: ${result.brandHealthScore}. Generated ${result.recommendations.length} recommendations.`);
    passed++;
  } else {
    logger.error('❌ FAIL: Invalid brand health score or recommendations.');
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
