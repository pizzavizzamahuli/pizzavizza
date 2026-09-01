import { z } from 'zod';

export const createValidationSchema = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape);

export const userProfileSchema = createValidationSchema({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
});

export const authInputSchema = createValidationSchema({
  email: z.string().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
