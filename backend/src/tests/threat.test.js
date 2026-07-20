import { generateThreatFallback } from '../services/threatService.js';
import logger from '../config/logger.js';

const runTests = async () => {
  logger.info('==================================================');
  logger.info('Starting AI Threat Detection & Priority Tests');
  logger.info('==================================================');

  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: 'Outage Crisis - Critical Priority',
      content: 'Server outage is causing a complete system down. Hackers breached database!',
      sentiment: 'negative',
      expectedPriority: 'critical',
      expectedThreats: ['crisis', 'reputation_risk'],
    },
    {
      name: 'dissatisfaction Complaint - High Priority',
      content: 'I hate this. The support agent lied, billing charge issue refund me.',
      sentiment: 'negative',
      expectedPriority: 'high',
      expectedThreats: ['complaint', 'support'],
    },
    {
      name: 'General Query - Medium Priority',
      content: 'How to query price information and shipping terms?',
      sentiment: 'neutral',
      expectedPriority: 'medium',
      expectedThreats: ['support'],
    },
    {
      name: 'Safe Neutral mention - Low Priority',
      content: 'Today is a normal sunny day in the city.',
      sentiment: 'neutral',
      expectedPriority: 'low',
      expectedThreats: [],
    },
  ];

  for (const tc of testCases) {
    logger.info(`Running Test Case: [${tc.name}]`);
    
    const result = generateThreatFallback(tc.content, tc.sentiment);
    
    const priorityMatch = result.priority === tc.expectedPriority;
    const threatsMatch = tc.expectedThreats.every(t => result.detectedThreats.includes(t));

    if (priorityMatch && threatsMatch) {
      logger.info(`✅ PASS: Rated as ${result.priority} priority. Detected threats: ${result.detectedThreats.join(', ')}`);
      passed++;
    } else {
      logger.error(`❌ FAIL: Expected priority: ${tc.expectedPriority}, threats containing: ${tc.expectedThreats.join(', ')}`);
      logger.error(`        Got priority: ${result.priority}, threats: ${result.detectedThreats.join(', ')}`);
      failed++;
    }
  }

  logger.info('==================================================');
  logger.info(`Tests Completed: ${passed} Passed, ${failed} Failed`);
  logger.info('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
