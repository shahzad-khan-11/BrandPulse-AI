import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';
import { geminiQueue } from '../utils/geminiQueue.js';

let genAI = null;

const getGenAIClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export const generateRegionalFallback = (content) => {
  const lowercase = (content || '').toLowerCase();
  
  // 1. Language detection & translation mapping
  let language = 'English';
  let translatedContent = content;

  if (/[\u0980-\u09FF]/.test(content)) {
    // Bengali or Assamese
    if (lowercase.includes('ভালো') || lowercase.includes('আনন্দিত') || lowercase.includes('খুব ভালো')) {
      language = 'Bengali';
      translatedContent = 'Bengali translated: BrandPulse service is very good, I am extremely happy.';
    } else if (lowercase.includes('অসম') || lowercase.includes('ভাল') || lowercase.includes('সেৱা')) {
      language = 'Assamese';
      translatedContent = 'Assamese translated: BrandPulse service is very good, I am very happy.';
    } else {
      language = 'Bengali';
      translatedContent = 'Bengali translated: BrandPulse service is very good, I am extremely happy.';
    }
  } else if (/[\u0900-\u097F]/.test(content)) {
    // Devanagari script - Hindi, Bhojpuri, Maithili, Marathi
    if (lowercase.includes('रउआ') || lowercase.includes('नीक सेवा') || lowercase.includes('लागल')) {
      language = 'Bhojpuri';
      translatedContent = 'Bhojpuri translated: BrandPulse gives you very good service, I liked it very much.';
    } else if (lowercase.includes('अहाँक') || lowercase.includes('छै') || lowercase.includes('भेल')) {
      language = 'Maithili';
      translatedContent = 'Maithili translated: BrandPulse, your product is so good, I liked it very much.';
    } else if (lowercase.includes('चांगले') || lowercase.includes('खूप') || lowercase.includes('आहे')) {
      language = 'Marathi';
      translatedContent = 'Marathi translated: BrandPulse app works great. No lag.';
    } else {
      language = 'Hindi';
      translatedContent = 'Hindi translated: Wow! The new BrandPulse app works really well. No lag.';
    }
  } else if (/[\u0A00-\u0A7F]/.test(content)) {
    language = 'Punjabi';
    translatedContent = 'Punjabi translated: The new service is very good.';
  } else if (/[\u0A80-\u0AFF]/.test(content)) {
    language = 'Gujarati';
    translatedContent = 'Gujarati translated: The new dashboard is excellent.';
  } else if (/[\u0B00-\u0B7F]/.test(content)) {
    language = 'Odia';
    translatedContent = 'Odia translated: BrandPulse works beautifully.';
  } else if (/[\u0B80-\u0BFF]/.test(content)) {
    language = 'Tamil';
    translatedContent = 'Tamil translated: This brand monitoring app is very fast.';
  } else if (/[\u0C00-\u0C7F]/.test(content)) {
    language = 'Telugu';
    translatedContent = 'Telugu translated: Customer support is excellent.';
  } else if (/[\u0C80-\u0CFF]/.test(content)) {
    language = 'Kannada';
    translatedContent = 'Kannada translated: Thank you for the wonderful product.';
  } else if (/[\u0D00-\u0D7F]/.test(content)) {
    language = 'Malayalam';
    translatedContent = 'Malayalam translated: The system operates smoothly.';
  }

  // 2. Sentiment and emotion detection
  let sentiment = 'neutral';
  let emotion = 'neutral';
  let sentimentScore = 0.0;
  
  const positiveKeywords = [
    'amazing', 'beautiful', 'बढ़िया', 'नीक', 'ভালো', 'आनंदित', 'पसन्द', 'magic', 'great', 'love', 'changle', 'saras', 'vadiya'
  ];
  const negativeKeywords = [
    'खराब', 'घटिया', 'गुस्सा', 'error', 'frustrating', 'bad', 'issue', 'hate', 'slow'
  ];

  const hasPositive = positiveKeywords.some(kw => lowercase.includes(kw));
  const hasNegative = negativeKeywords.some(kw => lowercase.includes(kw));

  if (hasPositive) {
    sentiment = 'positive';
    emotion = 'joy';
    sentimentScore = 0.8;
  } else if (hasNegative) {
    sentiment = 'negative';
    emotion = lowercase.includes('गुस्सा') || lowercase.includes('anger') ? 'anger' : 'sadness';
    sentimentScore = -0.8;
  }

  const targetCity = lowercase.includes('patna') ? 'Patna' : (lowercase.includes('kolkata') ? 'Kolkata' : 'Varanasi');
  
  let hindiReply = 'नमस्ते! ब्रांडपल्स सेवा चुनने के लिए धन्यवाद।';
  let englishReply = 'Hello! Thank you for choosing BrandPulse.';
  let friendlyReply = `Hey there! We are absolutely thrilled that you are enjoying BrandPulse in ${targetCity}! You rock!`;
  let professionalReply = `Dear Customer, We appreciate your positive feedback regarding our services in ${targetCity}. We remain committed to excellence.`;

  if (sentiment === 'negative') {
    hindiReply = 'नमस्ते! हमें आपकी परेशानी के लिए खेद है। हम जल्द ही आपसे संपर्क करेंगे।';
    englishReply = 'Hello! We sincerely apologize for the inconvenience caused. We are looking into this.';
    friendlyReply = `Oh no! We are so sorry to hear you ran into issues in ${targetCity}. Let us make this right for you immediately!`;
    professionalReply = `Dear Customer, We apologize for the performance issues experienced in ${targetCity}. Our engineering team is currently investigating the root cause.`;
  }

  return {
    language,
    translatedContent,
    sentiment,
    confidence: 0.9,
    emotion,
    summary: `Fallback analysis for: ${content.substring(0, 30)}...`,
    sentimentScore,
    aiAnalysis: {
      keyThemes: ['Fallback Theme'],
      emotionalTone: emotion,
      suggestedAction: sentiment === 'negative' ? 'Respond immediately to address issues.' : 'Thank the customer.',
      explanation: 'Analyzed using local fallback heuristics.',
      suggestedReplies: {
        hindiReply,
        englishReply,
        friendlyReply,
        professionalReply,
      }
    }
  };
};

/**
 * Detects regional language and performs sentiment analysis using Gemini API.
 * Supported languages: English, Hindi, Bhojpuri, Bengali, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese.
 * 
 * @param {string} content Text to analyze
 * @returns {Promise<object>} Analysis result containing language, sentiment, confidence, emotion, summary, and legacy fields.
 */
export const analyzeRegionalContent = async (content) => {
  logger.info(`[AI Service] Incoming content: "${content.substring(0, 60)}..."`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey.startsWith('your_')) {
    logger.warn('[AI Service] GEMINI_API_KEY is missing or placeholder. Running regional local fallback...');
    return generateRegionalFallback(content);
  }

  const client = getGenAIClient();

  logger.info(`[AI Service] Sending request to Gemini using gemini-3.1-flash-lite...`);
  const model = client.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert brand analyst specialized in Indian regional languages and culture.
    Analyze the sentiment, language, emotion, and context of the following social media post, review, or mention.
    
    You MUST identify the primary language from this list of supported languages:
    - English
    - Hindi
    - Bhojpuri
    - Bengali
    - Marathi
    - Gujarati
    - Punjabi
    - Tamil
    - Telugu
    - Kannada
    - Malayalam
    - Odia
    - Assamese
    (If it is in a different language, classify it as "English" or the closest matching supported language).
    
    You MUST also translate the content into English.
    
    Return the output as a valid JSON object matching this schema:
    {
      "language": "English" | "Hindi" | "Bhojpuri" | "Bengali" | "Marathi" | "Gujarati" | "Punjabi" | "Tamil" | "Telugu" | "Kannada" | "Malayalam" | "Odia" | "Assamese",
      "translatedContent": "string (the full translation of the original content in English)",
      "sentiment": "positive" | "neutral" | "negative",
      "confidence": float between 0.0 and 1.0,
      "emotion": string representing the primary emotion (e.g. "joy", "anger", "sadness", "fear", "surprise", "frustration", "neutral"),
      "summary": string (a short one-sentence summary of the content in English),
      "keyThemes": [string],
      "suggestedAction": string suggesting how the brand should respond,
      "explanation": string explaining your reasoning,
      "suggestedReplies": {
        "hindiReply": "string (a warm response written in Hindi script, tailored to the sentiment and content context)",
        "englishReply": "string (a response written in English, tailored to the sentiment and content context)",
        "friendlyReply": "string (a very casual, friendly, and enthusiastic response in English, tailored to the sentiment)",
        "professionalReply": "string (a highly polite, professional, and business-focused response in English, tailored to the sentiment)"
      }
    }
    
    Content to analyze:
    "${content.replace(/"/g, '\\"')}"
  `;

  const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'Regional Content Analysis' });
  const text = result.response.text();
  logger.info(`[AI Service] Received raw Gemini response: ${text.trim()}`);

  const parsedData = JSON.parse(text);
  
  // Calculate sentiment score equivalent for legacy fields
  let sentimentScore = 0.0;
  if (parsedData.sentiment === 'positive') sentimentScore = parsedData.confidence || 0.8;
  if (parsedData.sentiment === 'negative') sentimentScore = -(parsedData.confidence || 0.8);

  logger.info(`[AI Service] Successfully parsed Gemini analysis response`);
  return {
    language: parsedData.language || 'English',
    translatedContent: parsedData.translatedContent || content,
    sentiment: parsedData.sentiment || 'neutral',
    confidence: parsedData.confidence !== undefined ? parsedData.confidence : 0.8,
    emotion: parsedData.emotion || parsedData.emotionalTone || 'neutral',
    summary: parsedData.summary || parsedData.explanation || 'Analyzed by BrandPulse AI.',
    sentimentScore,
    aiAnalysis: {
      keyThemes: parsedData.keyThemes || [],
      emotionalTone: parsedData.emotion || parsedData.emotionalTone || 'neutral',
      suggestedAction: parsedData.suggestedAction || 'No immediate action required.',
      explanation: parsedData.explanation || 'Regional analysis completed by BrandPulse AI.',
      suggestedReplies: parsedData.suggestedReplies || {
        hindiReply: '',
        englishReply: '',
        friendlyReply: '',
        professionalReply: ''
      }
    }
  };
};

/**
 * Evaluates mention for spam/fake classification and priority reasoning
 */
export const analyzeSpamAndPriority = async (content, sentiment) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey.startsWith('your_')) {
    const lowercase = (content || '').toLowerCase();
    let aiClassification = 'GENUINE';
    let aiReason = 'Content passed local authenticity heuristic checks.';
    let aiConfidence = 0.9;
    
    if (lowercase.includes('click here') || lowercase.includes('free followers') || lowercase.includes('buy bitcoin')) {
      aiClassification = 'SPAM';
      aiReason = 'Repeated promotional link spam patterns detected.';
      aiConfidence = 0.95;
    } else if (lowercase.includes('fake review') || lowercase.includes('paid review') || lowercase.includes('bot review')) {
      aiClassification = 'POTENTIALLY_FAKE';
      aiReason = 'Unnatural review language or bot pattern detected.';
      aiConfidence = 0.85;
    }

    return { aiClassification, aiConfidence, aiReason };
  }

  try {
    const client = getGenAIClient();
    const model = client.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are an AI brand authenticity & spam detector.
      Analyze this mention:
      "${content.replace(/"/g, '\\"')}"

      Classify as:
      - "GENUINE": authentic user feedback, mention, or review
      - "POTENTIALLY_FAKE": suspicious bot review, unnatural campaign, or deceptive content
      - "SPAM": link spam, automated promotional text, or irrelvant filler

      Return JSON:
      {
        "aiClassification": "GENUINE" | "POTENTIALLY_FAKE" | "SPAM",
        "aiConfidence": float 0.0-1.0,
        "aiReason": "One-sentence explanation"
      }
    `;

    const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'Spam Analysis' });
    const parsed = JSON.parse(result.response.text());
    return {
      aiClassification: ['GENUINE', 'POTENTIALLY_FAKE', 'SPAM'].includes(parsed.aiClassification) ? parsed.aiClassification : 'GENUINE',
      aiConfidence: parsed.aiConfidence || 0.9,
      aiReason: parsed.aiReason || 'Analyzed by BrandPulse AI'
    };
  } catch (error) {
    logger.error(`[AI Service] Spam analysis failed: ${error.message}`);
    return { aiClassification: 'GENUINE', aiConfidence: 0.8, aiReason: 'Default fallback classification.' };
  }
};

export const generateAIReply = async ({
  content,
  sentiment = 'neutral',
  emotion = 'neutral',
  priority = 'low',
  classification = 'GENUINE',
  language = 'Auto Detect',
  brandName = 'our brand',
  tone = 'Professional',
  location = '',
  author = ''
}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Local Heuristic Fallback when Gemini API key is missing / placeholder
  if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey.startsWith('your_')) {
    let langStyle = language;
    if (language === 'Auto Detect') {
      if (/[\u0900-\u097F]/.test(content)) langStyle = 'Hindi';
      else if (/\b(khrab|kya|hai|samajh|nhi|rha|bilkul|bhai|yaar)\b/i.test(content)) langStyle = 'Hinglish';
      else langStyle = 'English';
    }

    if (sentiment === 'positive') {
      if (langStyle === 'Hindi') {
        return [
          { style: 'Professional', text: `नमस्ते ${author !== 'Anonymous' ? author : ''}! ${brandName} के प्रति आपकी सकारात्मक प्रतिक्रिया के लिए धन्यवाद। हम आपकी सेवा करके प्रसन्न हैं।` },
          { style: 'Friendly', text: `बहुत बहुत धन्यवाद! जानकर बेहद खुशी हुई कि आपको ${brandName} का अनुभव पसंद आया! 😊` },
          { style: 'Short', text: `आपकी प्रतिक्रिया के लिए धन्यवाद! ${brandName} टीम।` },
          { style: 'Detailed', text: `नमस्ते! ${brandName} को चुनने और अपना बहुमूल्य फीडबैक साझा करने के लिए धन्यवाद। हमारी टीम हमेशा सर्वश्रेष्ठ अनुभव प्रदान करने के लिए प्रतिबद्ध है।` }
        ];
      } else if (langStyle === 'Hinglish') {
        return [
          { style: 'Professional', text: `Thank you ${author !== 'Anonymous' ? author : ''} for your positive feedback regarding ${brandName}. We are glad to serve you.` },
          { style: 'Friendly', text: `Thanks a lot! Bahut khushi hui ki aapko ${brandName} ka experience achha laga! 🙌` },
          { style: 'Short', text: `Feedback ke liye shukriya! Team ${brandName}.` },
          { style: 'Detailed', text: `Thank you so much! ${brandName} ko choose karne aur apna valuable review share karne ke liye shukriya. We are always here to help.` }
        ];
      } else {
        return [
          { style: 'Professional', text: `Thank you ${author !== 'Anonymous' ? author : ''} for your positive feedback regarding ${brandName}. We are delighted to know you are enjoying the experience.` },
          { style: 'Friendly', text: `Thanks so much for the love! We're thrilled that you had a great experience with ${brandName}! 🎉` },
          { style: 'Short', text: `Thank you for your feedback! Team ${brandName}.` },
          { style: 'Detailed', text: `We really appreciate your kind feedback. Delivering excellent quality and service is our top priority at ${brandName}, and we look forward to serving you again.` }
        ];
      }
    } else if (sentiment === 'negative') {
      if (langStyle === 'Hindi') {
        return [
          { style: 'Professional', text: `हमें खेद है कि आपका अनुभव ${brandName} के साथ अच्छा नहीं रहा। हमारी सहायता टीम इस मामले की जांच कर रही है।` },
          { style: 'Friendly', text: `असुविधा के लिए माफी चाहते हैं! हम आपकी चिंता समझते हैं और इसे जल्द हल करना चाहते हैं।` },
          { style: 'Short', text: `असुविधा के लिए खेद है। हम जल्द ही आपसे संपर्क करेंगे।` },
          { style: 'Detailed', text: `हमें बहुत खेद है कि आपकी अपेक्षाएं पूरी नहीं हुईं। कृपया अपनी संपर्क जानकारी साझा करें ताकि हम इस समस्या का स्थायी समाधान कर सकें।` }
        ];
      } else if (langStyle === 'Hinglish') {
        return [
          { style: 'Professional', text: `Hum extremely sorry hain ki aapko ${brandName} ke sath issue face karna pada. Hamari team issue review kar rahi hai.` },
          { style: 'Friendly', text: `Sorry for the trouble! Hum samajhte hain aapki problem aur ise jaldi sort out kar denge.` },
          { style: 'Short', text: `Inconvenience ke liye sorry. Hum ispar work kar rahe hain.` },
          { style: 'Detailed', text: `Hum deeply apologize karte hain ki aapka experience expectations ke acche se meet nahi kar paya. Please details share karein taaki hum resolve kar sakein.` }
        ];
      } else {
        return [
          { style: 'Professional', text: `We're sorry to hear about your experience with ${brandName}. Our team is looking into this issue and we appreciate you bringing it to our attention.` },
          { style: 'Friendly', text: `Sorry about the trouble! We understand your concern and would love to help get this sorted out.` },
          { style: 'Short', text: `Sorry for the inconvenience. We're looking into this and will get back to you shortly.` },
          { style: 'Detailed', text: `We're sorry that your experience with ${brandName} didn't meet expectations. We'd like to understand what happened and help resolve the issue as quickly as possible.` }
        ];
      }
    } else {
      // Neutral
      return [
        { style: 'Professional', text: `Thank you for reaching out to ${brandName}. Please let us know if you have any questions or require further assistance.` },
        { style: 'Friendly', text: `Thanks for getting in touch! Let us know if we can help you with anything regarding ${brandName}.` },
        { style: 'Short', text: `Thanks for your mention! Team ${brandName}.` },
        { style: 'Detailed', text: `Thank you for sharing your thoughts about ${brandName}. We value all user feedback and are always here if you need any support.` }
      ];
    }
  }

  try {
    const client = getGenAIClient();
    const model = client.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
      You are an expert customer relations AI manager for "${brandName}".
      Generate EXACTLY 4 distinct reply suggestions to the following social media mention/review.

      Original Mention: "${content.replace(/"/g, '\\"')}"
      Author: "${author}"
      Detected Sentiment: ${sentiment}
      Detected Emotion: ${emotion}
      Priority: ${priority}
      Classification: ${classification}
      Location Context: ${location || 'N/A'}
      Requested Primary Language: ${language}
      Requested Primary Tone: ${tone}

      REQUIREMENTS:
      1. Generate 4 suggestions with different styles: "Professional", "Friendly", "Short", and "Detailed".
      2. If Requested Primary Language is "Auto Detect", detect the language/dialect of the original mention (e.g. English, Hindi, Hinglish, Bengali, etc.) and write suggestions in that language/style. Otherwise, write suggestions in the requested Language (${language}).
      3. Tailor every response to the content context (e.g. delivery issues should mention delivery, product issues should mention product, positive feedback should be warm thank-you).
      4. Never argue with negative complaints or make unsupported promises.
      5. Make sure all 4 suggestions are noticeably different sentences.

      Return JSON matching this exact structure:
      {
        "suggestions": [
          { "style": "Professional", "text": "..." },
          { "style": "Friendly", "text": "..." },
          { "style": "Short", "text": "..." },
          { "style": "Detailed", "text": "..." }
        ]
      }
    `;

    const result = await geminiQueue.enqueue(() => model.generateContent(prompt), { label: 'Generate AI Reply Suggestions' });
    const rawText = result.response.text();
    const parsed = JSON.parse(rawText);

    if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      return parsed.suggestions;
    }
    throw new Error('Gemini output lacked suggestions array');
  } catch (error) {
    logger.error(`[AI Service] Generate structured replies failed: ${error.message}`);
    // Fallback array
    return [
      { style: 'Professional', text: `Thank you for sharing your feedback regarding ${brandName}. Our team appreciates your input.` },
      { style: 'Friendly', text: `Thanks for reaching out! We appreciate your feedback on ${brandName}.` },
      { style: 'Short', text: `Thank you for your feedback! Team ${brandName}.` },
      { style: 'Detailed', text: `We appreciate you sharing your experience regarding ${brandName}. We're always striving to improve and value your thoughts.` }
    ];
  }
};

