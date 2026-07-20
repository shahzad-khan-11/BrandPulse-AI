import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string()
    .min(1, { message: 'Brand name is required' })
    .max(100, { message: 'Brand name cannot exceed 100 characters' })
    .trim(),
  keywords: z.array(z.string().min(1, { message: 'Keyword cannot be empty' }))
    .min(1, { message: 'Please provide at least one keyword for monitoring' }),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  region: z.string().trim().optional(),
});
