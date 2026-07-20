import { resolveLocationForMention } from '../services/locationService.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BrandMention from '../models/BrandMention.js';

dotenv.config();

const runTests = async () => {
  logger.info('==================================================');
  logger.info('Starting Hyperlocal Data Collection Tests');
  logger.info('==================================================');

  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: 'Content matching - Kolkata by keyword',
      content: 'We had an amazing launch event in Kolkata today!',
      language: 'English',
      source: 'twitter',
      manual: null,
      expected: { city: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639, src: 'twitter' }
    },
    {
      name: 'Content matching - Patna by keyword in Hindi',
      content: 'पटना में ब्रांडपल्स का नया ऑफिस खुल गया है।',
      language: 'Hindi',
      source: 'reddit',
      manual: null,
      expected: { city: 'Patna', state: 'Bihar', country: 'India', lat: 25.5941, lon: 85.1376, src: 'reddit' }
    },
    {
      name: 'Language fallback - Bengali content without city name',
      content: 'খুব সুন্দর সার্ভিস!',
      language: 'Bengali',
      source: 'web',
      manual: null,
      expected: { city: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639, src: 'web' }
    },
    {
      name: 'Language fallback - Bhojpuri content',
      content: 'रउआ सभ के सेवा बहुत नीक बा।',
      language: 'Bhojpuri',
      source: 'twitter',
      manual: null,
      expected: { city: 'Gorakhpur', state: 'Uttar Pradesh', country: 'India', lat: 26.7606, lon: 83.3731, src: 'twitter' }
    },
    {
      name: 'Manual override - Custom City and Coordinates',
      content: 'Testing custom location manual input.',
      language: 'English',
      source: 'custom',
      manual: { city: 'Ranchi', state: 'Jharkhand', country: 'India', latitude: 23.3441, longitude: 85.3096 },
      expected: { city: 'Ranchi', state: 'Jharkhand', country: 'India', lat: 23.3441, lon: 85.3096, src: 'custom' }
    }
  ];

  for (const tc of testCases) {
    logger.info(`Running Test: [${tc.name}]`);
    const resolved = resolveLocationForMention(tc.content, tc.language, tc.source, tc.manual);

    const cityMatch = resolved.city === tc.expected.city;
    const stateMatch = resolved.state === tc.expected.state;
    const countryMatch = resolved.country === tc.expected.country;
    const latMatch = Math.abs(resolved.latitude - tc.expected.lat) < 0.0001;
    const lonMatch = Math.abs(resolved.longitude - tc.expected.lon) < 0.0001;
    const srcMatch = resolved.sourcePlatform === tc.expected.src;

    if (cityMatch && stateMatch && countryMatch && latMatch && lonMatch && srcMatch) {
      logger.info(`✅ PASS: Resolved to ${resolved.city}, ${resolved.state} (${resolved.latitude}, ${resolved.longitude}) [Source: ${resolved.sourcePlatform}]`);
      passed++;
    } else {
      logger.error(`❌ FAIL: Expected { city: ${tc.expected.city}, lat: ${tc.expected.lat}, lon: ${tc.expected.lon}, src: ${tc.expected.src} }`);
      logger.error(`        Got      { city: ${resolved.city}, lat: ${resolved.latitude}, lon: ${resolved.longitude}, src: ${resolved.sourcePlatform} }`);
      failed++;
    }
  }

  // Database schema saving test
  logger.info('\nStarting Mongoose Schema validation test...');
  
  // Connect to database (will use local fallback mode if offline, but since we are offline, let's catch it gracefully)
  let dbConnected = false;
  try {
    const uri = process.env.MONGODB_URI;
    if (uri) {
      mongoose.set('strictQuery', true);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      dbConnected = true;
      logger.info('Connected to MongoDB for schema validation.');
    }
  } catch (err) {
    logger.warn(`Could not connect to MongoDB: ${err.message}. Skipping DB insertion check (offline mode).`);
  }

  if (dbConnected) {
    try {
      // Create a temporary mention with location info
      const mockMention = new BrandMention({
        brand: new mongoose.Types.ObjectId(),
        source: 'twitter',
        content: 'BrandPulse test mention with hyperlocal data.',
        publishedAt: new Date(),
        sentiment: 'positive',
        sentimentScore: 0.9,
        language: 'English',
        location: {
          city: 'Patna',
          state: 'Bihar',
          country: 'India',
          latitude: 25.5941,
          longitude: 85.1376,
          sourcePlatform: 'twitter'
        },
        sourcePlatform: 'twitter'
      });

      const saved = await mockMention.save();
      if (saved.location.city === 'Patna' && saved.sourcePlatform === 'twitter') {
        logger.info('✅ PASS: Mongoose schema successfully validated and saved location data.');
        passed++;
      } else {
        logger.error('❌ FAIL: Mongoose schema did not save location data correctly.');
        failed++;
      }

      // Cleanup
      await BrandMention.deleteOne({ _id: saved._id });
      await mongoose.disconnect();
    } catch (dbErr) {
      logger.error(`❌ FAIL: Database insertion failed: ${dbErr.message}`);
      failed++;
      try { await mongoose.disconnect(); } catch {}
    }
  } else {
    logger.info('⚠️ SKIPPED: Database write test skipped (MongoDB offline).');
  }

  logger.info('==================================================');
  logger.info(`Tests Completed: ${passed} Passed, ${failed} Failed`);
  logger.info('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
