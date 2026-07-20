// Constants definition for BrandPulse AI Database Layer

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  ANALYST: 'analyst',
};

export const SENTIMENT_TYPES = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
};

export const MENTION_SOURCES = {
  TWITTER: 'twitter',
  REDDIT: 'reddit',
  NEWS: 'news',
  WEB: 'web',
  CUSTOM: 'custom',
  LOCAL_NEWS: 'local_news',
  RSS: 'rss',
  REGIONAL_NEWS: 'regional_news',
  REGIONAL_BLOGS: 'regional_blogs',
  GOOGLE_REVIEWS: 'google_reviews',
  YOUTUBE: 'youtube',
  X: 'x',
};

export const WORKFLOW_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};
