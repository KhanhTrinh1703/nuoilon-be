import { z } from 'zod';

export const GreetingSchema = z.object({
  message: z.string(),
});

export type GeminiGreetingResponseDto = z.infer<typeof GreetingSchema>;
