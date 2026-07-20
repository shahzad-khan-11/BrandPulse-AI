import { generateRegionalFallback } from '../services/aiService.js';
import logger from '../config/logger.js';

const runTests = async () => {
  logger.info('==================================================');
  logger.info('Starting Regional Language Sentiment Analysis Tests');
  logger.info('==================================================');

  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: 'English - Positive Sentiment',
      content: 'Just tried BrandPulse and it is absolutely amazing! The sentiment charts are beautiful.',
      expectedLang: 'English',
      expectedSentiment: 'positive',
      expectedEmotion: 'joy',
    },
    {
      name: 'Hindi - Positive Sentiment',
      content: 'क्या बात है! BrandPulse का नया ऐप सच में बहुत बढ़िया काम कर रहा है। कोई लैग नहीं है।',
      expectedLang: 'Hindi',
      expectedSentiment: 'positive',
      expectedEmotion: 'joy',
    },
    {
      name: 'Bhojpuri - Positive Sentiment',
      content: 'BrandPulse रउआ सभ के बहुत नीक सेवा देता, हमरा बहुत नीक लागल।',
      expectedLang: 'Bhojpuri',
      expectedSentiment: 'positive',
      expectedEmotion: 'joy',
    },
    {
      name: 'Maithili - Positive Sentiment',
      content: 'BrandPulse अहाँक प्रोडक्ट कते नीक छै, हमरा बहुत पसन्द भेल।',
      expectedLang: 'Maithili',
      expectedSentiment: 'positive',
      expectedEmotion: 'joy',
    },
    {
      name: 'Bengali - Positive Sentiment',
      content: 'BrandPulse এর সার্ভিসটা খুব ভালো, আমি এটা ব্যবহার করে অত্যন্ত আনন্দিত।',
      expectedLang: 'Bengali',
      expectedSentiment: 'positive',
      expectedEmotion: 'joy',
    },
    {
      name: 'Hindi - Negative Sentiment',
      content: 'यह बहुत ही खराब और घटिया सेवा है, मुझे गुस्सा आ रहा है।',
      expectedLang: 'Hindi',
      expectedSentiment: 'negative',
      expectedEmotion: 'anger',
    },
  ];

  for (const tc of testCases) {
    logger.info(`Running Test Case: [${tc.name}]`);
    
    // We test the fallback algorithm directly since the API key might not be configured in test environments
    const result = generateRegionalFallback(tc.content);
    
    const langMatch = result.language === tc.expectedLang;
    const sentimentMatch = result.sentiment === tc.expectedSentiment;
    const emotionMatch = result.emotion === tc.expectedEmotion;

    if (langMatch && sentimentMatch && emotionMatch) {
      logger.info(`✅ PASS: Detected ${result.language} (${result.sentiment} / ${result.emotion})`);
      passed++;
    } else {
      logger.error(`❌ FAIL: Expected { lang: ${tc.expectedLang}, sentiment: ${tc.expectedSentiment}, emotion: ${tc.expectedEmotion} }`);
      logger.error(`        Got      { lang: ${result.language}, sentiment: ${result.sentiment}, emotion: ${result.emotion} }`);
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
