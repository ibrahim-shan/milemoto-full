import { z } from 'zod';

export const SetupStatusResponseSchema = z.object({
  installed: z.boolean(),
});

export const SetupInitializeSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SetupInitializeDto = z.infer<typeof SetupInitializeSchema>;
