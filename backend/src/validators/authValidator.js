import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(50, { message: 'Name cannot exceed 50 characters' })
    .trim(),
  email: z.string()
    .email({ message: 'Please provide a valid email address' })
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters long' })
    .max(100, { message: 'Password cannot exceed 100 characters' }),
});

export const loginSchema = z.object({
  email: z.string()
    .email({ message: 'Please provide a valid email address' })
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, { message: 'Password is required' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email({ message: 'Please provide a valid email address' })
    .trim()
    .toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters long' })
    .max(100, { message: 'Password cannot exceed 100 characters' }),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: 'Verification token is required' }),
});

export const refreshTokenSchema = z.object({
  token: z.string().min(1, { message: 'Refresh token is required' }),
});
