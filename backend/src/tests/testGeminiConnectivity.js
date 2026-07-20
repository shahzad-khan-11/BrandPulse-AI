import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testConnectivity() {
  console.log("==================================================");
  console.log("TASK 1 - VERIFY GEMINI CONFIGURATION");
  console.log("==================================================");
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("✗ GEMINI_API_KEY environment variable is missing!");
    process.exit(1);
  }
  console.log("✓ API key loaded");
  
  const modelsToTest = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'];
  console.log("Models to test:", modelsToTest);

  console.log("\n==================================================");
  console.log("TASK 2 - VERIFY REAL API");
  console.log("==================================================");
  
  for (const modelName of modelsToTest) {
    console.log(`\nTesting model: ${modelName}...`);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      console.log("Sending query: 'Return only the word OK.'...");
      const result = await model.generateContent('Return only the word OK.');
      const text = result.response.text().trim();
      
      console.log(`Response text for ${modelName}: '${text}'`);
      if (text.toLowerCase().includes("ok")) {
        console.log(`✓ Model ${modelName} passed live connectivity check!`);
      } else {
        console.warn(`⚠ Response received but did not exactly match OK: '${text}'`);
      }
    } catch (error) {
      console.error(`✗ Model ${modelName} failed!`);
      console.error("Error Message:", error.message);
      if (error.status) console.error("HTTP status:", error.status);
    }
  }
}

testConnectivity();
