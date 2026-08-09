import BrandRepository from '../repositories/BrandRepository.js';
import BrandMentionRepository from '../repositories/BrandMentionRepository.js';
import { analyzeRegionalContent } from '../services/aiService.js';
import { analyzeMentionThreats } from '../services/threatService.js';
import { resolveLocationForMention } from '../services/locationService.js';
import { dispatchWebhook } from '../services/webhookService.js';
import WorkflowLog from '../models/WorkflowLog.js';
import { pushNotification } from '../services/notificationService.js';
import { sendBrandCreatedEmail, sendBrandUpdatedEmail, sendBrandDeletedEmail } from '../services/emailService.js';
import logger from '../config/logger.js';

// @desc    Create a new brand
// @route   POST /api/brands
// @access  Private
export const createBrand = async (req, res, next) => {
  const { name, keywords, city, state, region } = req.body;

  try {
    const brand = await BrandRepository.create({
      name,
      keywords,
      organization: req.user.organization,
      createdBy: req.user._id,
      city: city || 'Delhi',
      state: state || 'Delhi',
      region: region || 'North India',
    });

    // Create workspace notification
    await pushNotification({
      userId: req.user._id,
      organizationId: req.user.organization,
      brandId: brand._id,
      title: 'Brand Created',
      message: `Brand "${brand.name}" has been successfully added to your workspace.`,
      category: 'workspace',
      priority: 'INFO'
    });

    // Send brand created email notification to authenticated user
    try {
      await sendBrandCreatedEmail(req.user.email, req.user.name, brand.name, region || 'North India');
    } catch (emailErr) {
      logger.error(`[BrandController] Brand created email failed for ${req.user.email}: ${emailErr.message}`);
    }

    // We return the response immediately to keep creation instantaneous
    res.status(201).json({ success: true, data: brand });

    // Generate dynamic regional mock mentions for the new brand (1 template to stay under daily limits)
    const mockTemplates = [
      {
        source: 'twitter',
        author: '@tech_guru',
        content: `Just got my hands on the new features from ${brand.name}! This is absolutely amazing and makes our workflow 10x faster. Highly recommended.`,
        daysAgo: 0,
      },
    ];

    // Run dynamic initial mentions sync sequentially in the background with delays to protect the Gemini API key from rate limits
    setTimeout(async () => {
      try {
        // Create an initial running workflow log so automation status shows active
        const log = await WorkflowLog.create({
          brand: brand._id,
          workflowType: 'sync_mentions',
          status: 'running',
          result: {
            message: 'Initializing dynamic automated brand monitoring...',
          },
        });

        // Run sequential sync
        for (let i = 0; i < mockTemplates.length; i++) {
          const template = mockTemplates[i];
          try {
            const analysis = await analyzeRegionalContent(template.content);
            const threatInfo = await analyzeMentionThreats(template.content, analysis.sentiment);
            const locationInfo = resolveLocationForMention(template.content, analysis.language, template.source);

            const publishedAt = new Date();
            publishedAt.setDate(publishedAt.getDate() - template.daysAgo);

            const mention = await BrandMentionRepository.create({
              brand: brand._id,
              source: template.source,
              content: template.content,
              translatedContent: analysis.translatedContent || '',
              author: template.author,
              url: `https://example.com/mention/${Math.floor(Math.random() * 100000)}`,
              publishedAt,
              sentiment: analysis.sentiment,
              sentimentScore: analysis.sentimentScore,
              language: analysis.language,
              confidence: analysis.confidence,
              emotion: analysis.emotion,
              summary: analysis.summary,
              aiAnalysis: analysis.aiAnalysis,
              location: locationInfo,
              sourcePlatform: locationInfo.sourcePlatform,
              priority: threatInfo.priority,
              threatAnalysis: {
                detectedThreats: threatInfo.detectedThreats,
                explanation: threatInfo.explanation
              }
            });

            // Dispatch webhook events to n8n triggers in background
            if (process.env.N8N_WEBHOOK_URL) {
              dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
                event: 'mention.created',
                timestamp: new Date().toISOString(),
                brandName: brand.name,
                mention: {
                  _id: mention._id,
                  brand: mention.brand,
                  author: mention.author,
                  source: mention.source,
                  content: mention.content,
                }
              }).catch(err => logger.error('n8n general webhook dispatch error:', err));

              if (mention.sentiment === 'negative') {
                dispatchWebhook(process.env.N8N_WEBHOOK_URL, {
                  event: 'mention.alert.negative',
                  timestamp: new Date().toISOString(),
                  brandName: brand.name,
                  data: {
                    id: mention._id,
                    author: mention.author,
                    source: mention.source,
                    content: mention.content,
                    sentimentScore: mention.sentimentScore,
                    emotionalTone: analysis.aiAnalysis.emotionalTone,
                    suggestedAction: analysis.aiAnalysis.suggestedAction,
                  },
                }).catch(err => logger.error('n8n negative webhook dispatch error:', err));
              }
            }
          } catch (err) {
            logger.error(`Error generating automatic initial mention for ${brand.name}:`, err);
          }

          // Delay 1200ms to respect Free Tier RPM limits
          if (i < mockTemplates.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
        }

        // Update workflow log status to completed to reflect healthy state
        log.status = 'completed';
        log.result = {
          message: 'Monitoring initialized automatically on brand registration.',
          syncedMentions: mockTemplates.length,
        };
        await log.save();

      } catch (err) {
        logger.error(`Error in automatic initialization background pipeline for ${brand.name}:`, err);
      }
    }, 100);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all user brands (with pagination, sort, search)
// @route   GET /api/brands
// @access  Private
export const getBrands = async (req, res, next) => {
  const { page, limit, sort, search } = req.query;

  try {
    const filters = {
      organization: req.user.organization,
    };

    if (search) {
      filters.name = { $regex: search, $options: 'i' };
    }

    const results = await BrandRepository.paginate(filters, { page, limit, sort });
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single brand by ID
// @route   GET /api/brands/:id
// @access  Private
export const getBrandById = async (req, res, next) => {
  try {
    const brand = await BrandRepository.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a brand and associated mentions (Soft Delete)
// @route   DELETE /api/brands/:id
// @access  Private
export const deleteBrand = async (req, res, next) => {
  try {
    const brand = await BrandRepository.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Soft delete associated mentions
    const mentions = await BrandMentionRepository.find({ brand: brand._id });
    for (const mention of mentions) {
      await BrandMentionRepository.delete(mention._id);
    }
    
    // Soft delete brand
    await BrandRepository.delete(brand._id);

    await pushNotification({
      userId: req.user._id,
      organizationId: req.user.organization,
      brandId: brand._id,
      title: 'Brand Deleted',
      message: `Brand "${brand.name}" and associated mentions were successfully deleted.`,
      category: 'workspace',
      priority: 'MEDIUM'
    });

    // Send brand deleted email notification safely
    try {
      await sendBrandDeletedEmail(req.user.email, req.user.name, brand.name);
    } catch (emailErr) {
      logger.error(`[BrandController] Brand deleted email failed for ${req.user.email}: ${emailErr.message}`);
    }

    res.json({ success: true, message: 'Brand and all associated mentions soft-deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a brand
// @route   PUT /api/brands/:id
// @access  Private
export const updateBrand = async (req, res, next) => {
  try {
    const brand = await BrandRepository.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const { name, keywords, city, state, region, language } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (region !== undefined) updateData.region = region;
    if (language !== undefined) updateData.language = language;

    const updatedBrand = await BrandRepository.update(brand._id, updateData);

    await pushNotification({
      userId: req.user._id,
      organizationId: req.user.organization,
      brandId: updatedBrand._id,
      title: 'Brand Updated',
      message: `Brand configuration for "${updatedBrand.name}" has been updated.`,
      category: 'workspace',
      priority: 'INFO'
    });

    // Send brand updated email notification safely
    try {
      await sendBrandUpdatedEmail(req.user.email, req.user.name, updatedBrand.name);
    } catch (emailErr) {
      logger.error(`[BrandController] Brand updated email failed for ${req.user.email}: ${emailErr.message}`);
    }

    res.json({ success: true, data: updatedBrand });
  } catch (error) {
    next(error);
  }
};
