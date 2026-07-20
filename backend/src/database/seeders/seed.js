import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../../config/logger.js';
import { connect } from '../index.js';

// Models imports
import Permission from '../../models/Permission.js';
import Role from '../../models/Role.js';
import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import Brand from '../../models/Brand.js';
import BrandMention from '../../models/BrandMention.js';
import Sentiment from '../../models/Sentiment.js';

dotenv.config();

const seed = async () => {
  logger.info('Database seeding operation started...');
  
  // Connect to DB
  await connect();
  
  try {
    // We preserve existing data (no deleteMany() triggers on any collections)
    logger.info('Preserving existing data. Running idempotent seeds...');
    
    // 1. Seed Permissions
    logger.info('Checking Permissions...');
    const permissionsData = [
      { name: 'brands:create', description: 'Create and track new brands' },
      { name: 'brands:read', description: 'View tracked brands' },
      { name: 'brands:delete', description: 'Remove tracked brands' },
      { name: 'mentions:read', description: 'View mentions logs' },
      { name: 'mentions:sync', description: 'Trigger mentions crawlers sync' },
    ];

    const seededPermissions = [];
    for (const p of permissionsData) {
      let perm = await Permission.findOne({ name: p.name });
      if (!perm) {
        perm = await Permission.create(p);
      }
      seededPermissions.push(perm);
    }
    
    // Create mapping helper
    const getPermId = (name) => seededPermissions.find(p => p.name === name)._id;
    
    // 2. Seed Roles
    logger.info('Checking Roles...');
    const rolesData = [
      {
        name: 'admin',
        description: 'Organization Administrator',
        permissions: seededPermissions.map(p => p._id),
      },
      {
        name: 'user',
        description: 'Standard Organization User',
        permissions: [getPermId('brands:read'), getPermId('mentions:read'), getPermId('mentions:sync')],
      },
      {
        name: 'analyst',
        description: 'Brand Data Analyst',
        permissions: [getPermId('brands:read'), getPermId('mentions:read')],
      },
    ];

    const seededRoles = [];
    for (const r of rolesData) {
      let role = await Role.findOne({ name: r.name });
      if (!role) {
        role = await Role.create(r);
      } else {
        role.permissions = r.permissions;
        await role.save();
      }
      seededRoles.push(role);
    }
    
    // 3. Seed Organization
    logger.info('Checking Organization...');
    let organization = await Organization.findOne({ slug: 'acme-enterprises' });
    if (!organization) {
      organization = await Organization.create({
        name: 'Acme Enterprises',
        slug: 'acme-enterprises',
        billingTier: 'growth',
      });
    }
    
    // 4. Seed Admin User
    logger.info('Checking Admin User...');
    const adminRole = seededRoles.find(r => r.name === 'admin');
    let adminUser = await User.findOne({ email: 'admin@acme.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Acme Administrator',
        email: 'admin@acme.com',
        password: 'password123',
        role: 'admin',
        roleRef: adminRole._id,
        organization: organization._id,
      });
    }
    
    // 5. Seed Sample Brand
    logger.info('Checking Monitored Brand...');
    let brand = await Brand.findOne({ name: 'Acme Corp', organization: organization._id });
    if (!brand) {
      brand = await Brand.create({
        name: 'Acme Corp',
        keywords: ['acme', 'acme corp', '#acme'],
        organization: organization._id,
        createdBy: adminUser._id,
      });
    }
    
    // 6. Seed Sample Brand Mentions
    logger.info('Checking Brand Mentions with AI Sentiment analysis...');
    const mentionsData = [
      {
        brand: brand._id,
        source: 'twitter',
        author: '@tech_pioneer',
        content: 'Acme Corp just released their new AI Dashboard. It is absolute magic! Highly optimized and gorgeous glassmorphism panels.',
        sentiment: 'positive',
        sentimentScore: 0.9,
        aiAnalysis: {
          keyThemes: ['AI Dashboard', 'UI Design', 'Launch'],
          emotionalTone: 'excited',
          suggestedAction: 'Retweet/share and thank the author.',
          explanation: 'User explicitly praises the dashboard features, layout style, and speeds, giving a highly positive score.',
        },
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        brand: brand._id,
        source: 'reddit',
        author: 'u/sysadmin_pro',
        content: 'Acme Corp servers are taking a massive hit today. Standard dashboard queries are throwing 504 gateway timeouts. Anyone else?',
        sentiment: 'negative',
        sentimentScore: -0.85,
        aiAnalysis: {
          keyThemes: ['Server Outage', 'Slow Dashboard', 'Timeout Errors'],
          emotionalTone: 'frustrated',
          suggestedAction: 'Notify DevOps immediately and post service status update.',
          explanation: 'Critical post detailing a production server slowdown and query errors, giving a strong negative sentiment.',
        },
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        brand: brand._id,
        source: 'news',
        author: 'Wall Street Journal',
        content: 'Acme Corp maintains steady growth plans heading into Q3, announcing plans to evaluate new target markets in Europe.',
        sentiment: 'neutral',
        sentimentScore: 0.0,
        aiAnalysis: {
          keyThemes: ['Corporate Growth', 'Q3 Outlook', 'European Markets'],
          emotionalTone: 'objective',
          suggestedAction: 'Monitor corporate mentions timeline.',
          explanation: 'Standard financial report detailing corporate updates without negative or positive emotional cues.',
        },
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    for (const m of mentionsData) {
      const exists = await BrandMention.findOne({ brand: m.brand, content: m.content });
      if (!exists) {
        await BrandMention.create(m);
      }
    }
    
    // 7. Seed Daily Sentiment aggregation logs
    logger.info('Checking Sentiment Daily Timeline Metrics...');
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    let sentimentRecord = await Sentiment.findOne({ brand: brand._id, date: todayStart });
    if (!sentimentRecord) {
      await Sentiment.create({
        brand: brand._id,
        date: todayStart,
        averageScore: 0.05,
        positiveCount: 1,
        neutralCount: 1,
        negativeCount: 1,
        totalCount: 3,
      });
    }
    
    logger.info('Database seeded/validated successfully!');
  } catch (error) {
    logger.error(`Database seeding failed: ${error.message}`);
  } finally {
    await mongoose.disconnect();
    logger.info('Database connection closed.');
  }
};

// Check if run directly from terminal command line
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  seed();
}

export default seed;
