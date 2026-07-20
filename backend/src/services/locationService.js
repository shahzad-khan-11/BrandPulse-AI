import logger from '../config/logger.js';

/**
 * Comprehensive India city registry covering Tier 1/2/3/4 cities.
 * Each entry includes: city, state, region, tier, lat/lng, and keyword triggers.
 * 
 * Tier 1 — Major metros (population > 4M)
 * Tier 2 — Growing cities (population 1M–4M)
 * Tier 3 — Emerging cities (population 0.3M–1M)
 * Tier 4 — Smaller towns and district HQs (population < 0.3M)
 */
export const CITY_REGISTRY = [
  // ─── TIER 1: MAJOR METROS ────────────────────────────────────────────────────
  { city: 'Delhi', state: 'Delhi', region: 'North India', tier: 1, country: 'India', latitude: 28.7041, longitude: 77.1025, keywords: ['delhi', 'new delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ncr', 'दिल्ली', 'नोएडा', 'गुरुग्राम'] },
  { city: 'Mumbai', state: 'Maharashtra', region: 'West India', tier: 1, country: 'India', latitude: 19.0760, longitude: 72.8777, keywords: ['mumbai', 'bombay', 'thane', 'navi mumbai', 'मुंबई', 'बॉम्बे'] },
  { city: 'Bengaluru', state: 'Karnataka', region: 'South India', tier: 1, country: 'India', latitude: 12.9716, longitude: 77.5946, keywords: ['bengaluru', 'bangalore', 'whitefield', 'electronic city', 'ಬೆಂಗಳೂರು'] },
  { city: 'Hyderabad', state: 'Telangana', region: 'South India', tier: 1, country: 'India', latitude: 17.3850, longitude: 78.4867, keywords: ['hyderabad', 'cyberabad', 'hitec city', 'secunderabad', 'హైదరాబాద్'] },
  { city: 'Chennai', state: 'Tamil Nadu', region: 'South India', tier: 1, country: 'India', latitude: 13.0827, longitude: 80.2707, keywords: ['chennai', 'madras', 'சென்னை'] },
  { city: 'Kolkata', state: 'West Bengal', region: 'East India', tier: 1, country: 'India', latitude: 22.5726, longitude: 88.3639, keywords: ['kolkata', 'calcutta', 'howrah', 'salt lake', 'কলকাতা', 'কোলকাতা'] },
  { city: 'Pune', state: 'Maharashtra', region: 'West India', tier: 1, country: 'India', latitude: 18.5204, longitude: 73.8567, keywords: ['pune', 'pimpri', 'pcmc', 'hinjewadi', 'पुणे'] },
  { city: 'Ahmedabad', state: 'Gujarat', region: 'West India', tier: 1, country: 'India', latitude: 23.0225, longitude: 72.5714, keywords: ['ahmedabad', 'amdavad', 'gandhinagar', 'અમદાવાદ'] },

  // ─── TIER 2: GROWING CITIES ──────────────────────────────────────────────────
  { city: 'Jaipur', state: 'Rajasthan', region: 'North India', tier: 2, country: 'India', latitude: 26.9124, longitude: 75.7873, keywords: ['jaipur', 'pink city', 'जयपुर'] },
  { city: 'Lucknow', state: 'Uttar Pradesh', region: 'North India', tier: 2, country: 'India', latitude: 26.8467, longitude: 80.9462, keywords: ['lucknow', 'awadh', 'nawabi', 'लखनऊ'] },
  { city: 'Surat', state: 'Gujarat', region: 'West India', tier: 2, country: 'India', latitude: 21.1702, longitude: 72.8311, keywords: ['surat', 'diamond city', 'सूरत'] },
  { city: 'Kanpur', state: 'Uttar Pradesh', region: 'North India', tier: 2, country: 'India', latitude: 26.4499, longitude: 80.3319, keywords: ['kanpur', 'cawnpore', 'कानपुर'] },
  { city: 'Nagpur', state: 'Maharashtra', region: 'Central India', tier: 2, country: 'India', latitude: 21.1458, longitude: 79.0882, keywords: ['nagpur', 'orange city', 'नागपुर'] },
  { city: 'Indore', state: 'Madhya Pradesh', region: 'Central India', tier: 2, country: 'India', latitude: 22.7196, longitude: 75.8577, keywords: ['indore', 'इंदौर'] },
  { city: 'Bhopal', state: 'Madhya Pradesh', region: 'Central India', tier: 2, country: 'India', latitude: 23.2599, longitude: 77.4126, keywords: ['bhopal', 'lake city', 'भोपाल'] },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', region: 'South India', tier: 2, country: 'India', latitude: 17.6868, longitude: 83.2185, keywords: ['visakhapatnam', 'vizag', 'waltair', 'విశాఖపట్నం'] },
  { city: 'Prayagraj', state: 'Uttar Pradesh', region: 'North India', tier: 2, country: 'India', latitude: 25.4358, longitude: 81.8463, keywords: ['prayagraj', 'allahabad', 'sangam', 'प्रयागराज', 'इलाहाबाद'] },
  { city: 'Patna', state: 'Bihar', region: 'East India', tier: 2, country: 'India', latitude: 25.5941, longitude: 85.1376, keywords: ['patna', 'bihar', 'ara', 'chapra', 'पटना'] },
  { city: 'Vadodara', state: 'Gujarat', region: 'West India', tier: 2, country: 'India', latitude: 22.3072, longitude: 73.1812, keywords: ['vadodara', 'baroda', 'વડોદરા'] },
  { city: 'Ludhiana', state: 'Punjab', region: 'North India', tier: 2, country: 'India', latitude: 30.9010, longitude: 75.8573, keywords: ['ludhiana', 'ਲੁਧਿਆਣਾ'] },
  { city: 'Agra', state: 'Uttar Pradesh', region: 'North India', tier: 2, country: 'India', latitude: 27.1767, longitude: 78.0081, keywords: ['agra', 'taj mahal', 'आगरा'] },
  { city: 'Nashik', state: 'Maharashtra', region: 'West India', tier: 2, country: 'India', latitude: 19.9975, longitude: 73.7898, keywords: ['nashik', 'nasik', 'नाशिक'] },
  { city: 'Faridabad', state: 'Haryana', region: 'North India', tier: 2, country: 'India', latitude: 28.4089, longitude: 77.3178, keywords: ['faridabad', 'फ़रीदाबाद'] },
  { city: 'Meerut', state: 'Uttar Pradesh', region: 'North India', tier: 2, country: 'India', latitude: 28.9845, longitude: 77.7064, keywords: ['meerut', 'मेरठ'] },
  { city: 'Rajkot', state: 'Gujarat', region: 'West India', tier: 2, country: 'India', latitude: 22.3039, longitude: 70.8022, keywords: ['rajkot', 'રાજકોટ'] },
  { city: 'Varanasi', state: 'Uttar Pradesh', region: 'North India', tier: 2, country: 'India', latitude: 25.3176, longitude: 82.9739, keywords: ['varanasi', 'banaras', 'benares', 'kashi', 'वाराणसी', 'बनारस', 'काशी'] },
  { city: 'Srinagar', state: 'Jammu & Kashmir', region: 'North India', tier: 2, country: 'India', latitude: 34.0837, longitude: 74.7973, keywords: ['srinagar', 'kashmir', 'dal lake', 'श्रीनगर'] },
  { city: 'Amritsar', state: 'Punjab', region: 'North India', tier: 2, country: 'India', latitude: 31.6340, longitude: 74.8723, keywords: ['amritsar', 'golden temple', 'ਅੰਮ੍ਰਿਤਸਰ'] },
  { city: 'Raipur', state: 'Chhattisgarh', region: 'Central India', tier: 2, country: 'India', latitude: 21.2514, longitude: 81.6296, keywords: ['raipur', 'chhattisgarh', 'रायपुर'] },
  { city: 'Chandigarh', state: 'Chandigarh', region: 'North India', tier: 2, country: 'India', latitude: 30.7333, longitude: 76.7794, keywords: ['chandigarh', 'tricity', 'ਚੰਡੀਗੜ੍ਹ'] },
  { city: 'Coimbatore', state: 'Tamil Nadu', region: 'South India', tier: 2, country: 'India', latitude: 11.0168, longitude: 76.9558, keywords: ['coimbatore', 'kovai', 'கோயம்புத்தூர்'] },
  { city: 'Kochi', state: 'Kerala', region: 'South India', tier: 2, country: 'India', latitude: 9.9312, longitude: 76.2673, keywords: ['kochi', 'cochin', 'ernakulam', 'കൊച്ചി'] },
  { city: 'Thiruvananthapuram', state: 'Kerala', region: 'South India', tier: 2, country: 'India', latitude: 8.5241, longitude: 76.9366, keywords: ['thiruvananthapuram', 'trivandrum', 'തിരുവനന്തപുരം'] },
  { city: 'Bhubaneswar', state: 'Odisha', region: 'East India', tier: 2, country: 'India', latitude: 20.2961, longitude: 85.8245, keywords: ['bhubaneswar', 'bhubaneshwar', 'odisha', 'ଭୁବନେଶ୍ୱର'] },
  { city: 'Guwahati', state: 'Assam', region: 'Northeast India', tier: 2, country: 'India', latitude: 26.1445, longitude: 91.7362, keywords: ['guwahati', 'gauhati', 'assam', 'গুৱাহাটী'] },

  // ─── TIER 3: EMERGING CITIES ─────────────────────────────────────────────────
  { city: 'Gorakhpur', state: 'Uttar Pradesh', region: 'North India', tier: 3, country: 'India', latitude: 26.7606, longitude: 83.3731, keywords: ['gorakhpur', 'basti', 'deoria', 'गोरखपुर'] },
  { city: 'Darbhanga', state: 'Bihar', region: 'East India', tier: 3, country: 'India', latitude: 26.1542, longitude: 85.8918, keywords: ['darbhanga', 'madhubani', 'saharsa', 'maithili', 'दरभंगा', 'मधुबनी'] },
  { city: 'Siliguri', state: 'West Bengal', region: 'East India', tier: 3, country: 'India', latitude: 26.7271, longitude: 88.3953, keywords: ['siliguri', 'darjeeling', 'শিলিগুড়ি'] },
  { city: 'Durgapur', state: 'West Bengal', region: 'East India', tier: 3, country: 'India', latitude: 23.5204, longitude: 87.3119, keywords: ['durgapur', 'asansol', 'দুর্গাপুর'] },
  { city: 'Ranchi', state: 'Jharkhand', region: 'East India', tier: 3, country: 'India', latitude: 23.3441, longitude: 85.3096, keywords: ['ranchi', 'jharkhand', 'रांची'] },
  { city: 'Jodhpur', state: 'Rajasthan', region: 'North India', tier: 3, country: 'India', latitude: 26.2389, longitude: 73.0243, keywords: ['jodhpur', 'blue city', 'marwar', 'जोधपुर'] },
  { city: 'Gwalior', state: 'Madhya Pradesh', region: 'Central India', tier: 3, country: 'India', latitude: 26.2183, longitude: 78.1828, keywords: ['gwalior', 'ग्वालियर'] },
  { city: 'Jabalpur', state: 'Madhya Pradesh', region: 'Central India', tier: 3, country: 'India', latitude: 23.1815, longitude: 79.9864, keywords: ['jabalpur', 'jabbalpur', 'जबलपुर'] },
  { city: 'Madurai', state: 'Tamil Nadu', region: 'South India', tier: 3, country: 'India', latitude: 9.9252, longitude: 78.1198, keywords: ['madurai', 'meenakshi', 'மதுரை'] },
  { city: 'Tiruchirappalli', state: 'Tamil Nadu', region: 'South India', tier: 3, country: 'India', latitude: 10.7905, longitude: 78.7047, keywords: ['tiruchirappalli', 'trichy', 'திருச்சிராப்பள்ளி'] },
  { city: 'Vijayawada', state: 'Andhra Pradesh', region: 'South India', tier: 3, country: 'India', latitude: 16.5062, longitude: 80.6480, keywords: ['vijayawada', 'bezawada', 'విజయవాడ'] },
  { city: 'Kota', state: 'Rajasthan', region: 'North India', tier: 3, country: 'India', latitude: 25.2138, longitude: 75.8648, keywords: ['kota', 'coaching city', 'कोटा'] },
  { city: 'Dehradun', state: 'Uttarakhand', region: 'North India', tier: 3, country: 'India', latitude: 30.3165, longitude: 78.0322, keywords: ['dehradun', 'doon', 'uttarakhand', 'देहरादून'] },
  { city: 'Mangaluru', state: 'Karnataka', region: 'South India', tier: 3, country: 'India', latitude: 12.9141, longitude: 74.8560, keywords: ['mangaluru', 'mangalore', 'ಮಂಗಳೂರು'] },
  { city: 'Puducherry', state: 'Puducherry', region: 'South India', tier: 3, country: 'India', latitude: 11.9416, longitude: 79.8083, keywords: ['puducherry', 'pondicherry', 'புதுச்சேரி'] },
  { city: 'Bhilai', state: 'Chhattisgarh', region: 'Central India', tier: 3, country: 'India', latitude: 21.2090, longitude: 81.4285, keywords: ['bhilai', 'durg', 'भिलाई'] },
  { city: 'Bhiwandi', state: 'Maharashtra', region: 'West India', tier: 3, country: 'India', latitude: 19.2967, longitude: 73.0630, keywords: ['bhiwandi', 'bhivandi', 'भिवंडी'] },

  // ─── TIER 4: SMALLER TOWNS & DISTRICT HQs ────────────────────────────────────
  { city: 'Muzaffarpur', state: 'Bihar', region: 'East India', tier: 4, country: 'India', latitude: 26.1209, longitude: 85.3647, keywords: ['muzaffarpur', 'मुजफ्फरपुर'] },
  { city: 'Bhagalpur', state: 'Bihar', region: 'East India', tier: 4, country: 'India', latitude: 25.2425, longitude: 86.9842, keywords: ['bhagalpur', 'silk city', 'भागलपुर'] },
  { city: 'Agartala', state: 'Tripura', region: 'Northeast India', tier: 4, country: 'India', latitude: 23.8315, longitude: 91.2868, keywords: ['agartala', 'tripura', 'আগরতলা'] },
  { city: 'Shimla', state: 'Himachal Pradesh', region: 'North India', tier: 4, country: 'India', latitude: 31.1048, longitude: 77.1734, keywords: ['shimla', 'simla', 'himachal', 'शिमला'] },
  { city: 'Udaipur', state: 'Rajasthan', region: 'North India', tier: 4, country: 'India', latitude: 24.5854, longitude: 73.7125, keywords: ['udaipur', 'lake city rajasthan', 'mewar', 'उदयपुर'] },
  { city: 'Tirupati', state: 'Andhra Pradesh', region: 'South India', tier: 4, country: 'India', latitude: 13.6288, longitude: 79.4192, keywords: ['tirupati', 'tirumala', 'తిరుపతి'] },
  { city: 'Warangal', state: 'Telangana', region: 'South India', tier: 4, country: 'India', latitude: 17.9689, longitude: 79.5941, keywords: ['warangal', 'hanamkonda', 'వరంగల్'] },
  { city: 'Salem', state: 'Tamil Nadu', region: 'South India', tier: 4, country: 'India', latitude: 11.6643, longitude: 78.1460, keywords: ['salem', 'steel city tn', 'சேலம்'] },
  { city: 'Ajmer', state: 'Rajasthan', region: 'North India', tier: 4, country: 'India', latitude: 26.4499, longitude: 74.6399, keywords: ['ajmer', 'dargah', 'अजमेर'] },
  { city: 'Kolhapur', state: 'Maharashtra', region: 'West India', tier: 4, country: 'India', latitude: 16.7050, longitude: 74.2433, keywords: ['kolhapur', 'kolhapuri', 'कोल्हापूर'] },
  { city: 'Bilaspur', state: 'Chhattisgarh', region: 'Central India', tier: 4, country: 'India', latitude: 22.0797, longitude: 82.1391, keywords: ['bilaspur chhattisgarh', 'बिलासपुर'] },
];

// Language-to-city default fallback mapping
const LANGUAGE_FALLBACKS = {
  'Bengali': { city: 'Kolkata', state: 'West Bengal', region: 'East India', tier: 1, country: 'India', latitude: 22.5726, longitude: 88.3639 },
  'Bhojpuri': { city: 'Gorakhpur', state: 'Uttar Pradesh', region: 'North India', tier: 3, country: 'India', latitude: 26.7606, longitude: 83.3731 },
  'Maithili': { city: 'Darbhanga', state: 'Bihar', region: 'East India', tier: 3, country: 'India', latitude: 26.1542, longitude: 85.8918 },
  'Hindi': { city: 'Varanasi', state: 'Uttar Pradesh', region: 'North India', tier: 2, country: 'India', latitude: 25.3176, longitude: 82.9739 },
  'Tamil': { city: 'Chennai', state: 'Tamil Nadu', region: 'South India', tier: 1, country: 'India', latitude: 13.0827, longitude: 80.2707 },
  'Telugu': { city: 'Hyderabad', state: 'Telangana', region: 'South India', tier: 1, country: 'India', latitude: 17.3850, longitude: 78.4867 },
  'Kannada': { city: 'Bengaluru', state: 'Karnataka', region: 'South India', tier: 1, country: 'India', latitude: 12.9716, longitude: 77.5946 },
  'Malayalam': { city: 'Kochi', state: 'Kerala', region: 'South India', tier: 2, country: 'India', latitude: 9.9312, longitude: 76.2673 },
  'Gujarati': { city: 'Ahmedabad', state: 'Gujarat', region: 'West India', tier: 1, country: 'India', latitude: 23.0225, longitude: 72.5714 },
  'Marathi': { city: 'Pune', state: 'Maharashtra', region: 'West India', tier: 1, country: 'India', latitude: 18.5204, longitude: 73.8567 },
  'Punjabi': { city: 'Amritsar', state: 'Punjab', region: 'North India', tier: 2, country: 'India', latitude: 31.6340, longitude: 74.8723 },
  'Odia': { city: 'Bhubaneswar', state: 'Odisha', region: 'East India', tier: 2, country: 'India', latitude: 20.2961, longitude: 85.8245 },
  'Assamese': { city: 'Guwahati', state: 'Assam', region: 'Northeast India', tier: 2, country: 'India', latitude: 26.1445, longitude: 91.7362 },
  'English': { city: 'Bengaluru', state: 'Karnataka', region: 'South India', tier: 1, country: 'India', latitude: 12.9716, longitude: 77.5946 },
};

/**
 * Resolves location metadata for a mention based on content keywords, detected language,
 * or manual user payload.
 *
 * @param {string} content Mention text content
 * @param {string} language Detected language (e.g. English, Hindi, Bengali)
 * @param {string} source Source platform (e.g. twitter, reddit, custom)
 * @param {object} [manualLocation] Manually supplied location from request body
 * @returns {object} Full resolved location schema
 */
export const resolveLocationForMention = (content, language, source, manualLocation) => {
  logger.info(`Resolving hyperlocal location for mention (source: ${source}, language: ${language})...`);

  // 1. If manual location details are provided in request body, validate and use them
  if (manualLocation && (manualLocation.city || manualLocation.latitude)) {
    // Try to enrich manual location with tier/region from registry
    const matched = CITY_REGISTRY.find(
      loc => loc.city.toLowerCase() === (manualLocation.city || '').toLowerCase()
    );
    return {
      city: manualLocation.city || 'Unknown',
      state: manualLocation.state || (matched?.state || 'Unknown'),
      region: manualLocation.region || (matched?.region || 'Unknown'),
      tier: matched?.tier || null,
      country: manualLocation.country || 'India',
      latitude: Number(manualLocation.latitude) || 0.0,
      longitude: Number(manualLocation.longitude) || 0.0,
      sourcePlatform: source || 'custom',
    };
  }

  const lowercaseContent = (content || '').toLowerCase();

  // 2. Scan content for city/location keywords
  for (const loc of CITY_REGISTRY) {
    if (loc.keywords.some(keyword => lowercaseContent.includes(keyword))) {
      logger.info(`Hyperlocal match found in content: ${loc.city} (Tier ${loc.tier}, ${loc.region})`);
      return {
        city: loc.city,
        state: loc.state,
        region: loc.region,
        tier: loc.tier,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
        sourcePlatform: source || 'web',
      };
    }
  }

  // 3. Fallback to language-based regional locations
  const fallback = LANGUAGE_FALLBACKS[language] || LANGUAGE_FALLBACKS['English'];
  logger.info(`Hyperlocal fallback applied based on language (${language}): ${fallback.city}`);

  return {
    city: fallback.city,
    state: fallback.state,
    region: fallback.region,
    tier: fallback.tier,
    country: fallback.country,
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    sourcePlatform: source || 'web',
  };
};

/**
 * Returns the full city registry for use in API endpoints.
 * @returns {Array} All city entries with tier and region metadata
 */
export const getCityRegistry = () => CITY_REGISTRY;
