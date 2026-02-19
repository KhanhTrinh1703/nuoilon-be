import { z } from 'zod';

// Zod Schema
export const FundPriceResponseSchema = z.object({
  price: z.number().default(0),
  confidence: z.number().default(0),
});

// TypeScript type
export type FundPriceResponse = z.infer<typeof FundPriceResponseSchema>;
