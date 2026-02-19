import { z } from 'zod';

// Zod Schema
export const FundPriceResponseSchema = z.object({
  price: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .default(0),
  confidence: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .default(0),
});

// TypeScript type
export type FundPriceResponse = z.infer<typeof FundPriceResponseSchema>;
