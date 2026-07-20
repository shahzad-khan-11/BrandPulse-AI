import { z } from 'zod';

export const createMentionSchema = z.object({
  source: z.enum(['twitter', 'reddit', 'news', 'web', 'custom'])
    .default('web'),
  content: z.string()
    .min(1, { message: 'Content is required' })
    .max(5000, { message: 'Content cannot exceed 5000 characters' })
    .trim(),
  author: z.string()
    .max(100, { message: 'Author name cannot exceed 100 characters' })
    .default('Anonymous')
    .optional(),
  url: z.string()
    .url({ message: 'Please provide a valid source URL' })
    .or(z.literal(''))
    .optional(),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    latitude: z.number().or(z.string().transform(v => parseFloat(v))).optional(),
    longitude: z.number().or(z.string().transform(v => parseFloat(v))).optional(),
  }).optional(),
});
