import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { fetchNewsForBrand } from '../services/newsService.js';
import { analyzeNewsArticles } from '../services/geminiService.js';

// Setup __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const testBrands = ['Tesla', 'Google', 'Microsoft'];

async function runNewsApiTest() {
  console.log('==================================================');
  console.log('Starting News API and AI News Analysis Integration Tests');
  console.log('==================================================');

  for (const brand of testBrands) {
    console.log(`\nTesting NewsAPI for Brand: [${brand}]`);
    try {
      const articles = await fetchNewsForBrand(brand, 1, 3);
      console.log(`✅ Success: Fetched ${articles.length} articles for ${brand}.`);
      if (articles.length > 0) {
        console.log(`- Headline Example: "${articles[0].title}"`);
        console.log(`- Source: ${articles[0].source}`);
        console.log(`- Date: ${articles[0].publishedAt}`);
        console.log(`- URL: ${articles[0].url}`);
        
        console.log(`Running Gemini AI News Analysis for [${brand}] using the articles...`);
        const analysis = await analyzeNewsArticles(brand, articles);
        console.log(`✅ Success: AI news analysis completed.`);
        console.log(`- Overall Sentiment: ${analysis.overallSentiment}`);
        console.log(`- Reputation Score: ${analysis.reputationScore}/100`);
        console.log(`- Executive Summary: "${analysis.executiveSummary.substring(0, 100)}..."`);
      } else {
        console.log(`⚠️ Warning: No articles returned for ${brand}.`);
      }
    } catch (error) {
      console.log(`❌ FAILED for ${brand}:`);
      console.log(`   Reason: ${error.message}`);
    }
  }

  console.log('\n==================================================');
  console.log('News API Integration Tests Completed');
  console.log('==================================================');
}

runNewsApiTest();
