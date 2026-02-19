import { z } from 'zod';

// Zod Schemas
export const DepositSchema = z.object({
  type: z.literal('deposit'),
  amount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  currency: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => (val === null ? null : String(val))),
  confidence: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .default(0),
});

export const CertificateSchema = z.object({
  type: z.literal('certificate'),
  matched_price: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .default(0),
  matched_quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .default(0),
  confidence: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .default(0),
});

export const UndefinedSchema = z.object({
  type: z.literal('undefined'),
});

export const GeminiOcrResponseSchema = z.discriminatedUnion('type', [
  DepositSchema,
  CertificateSchema,
  UndefinedSchema,
]);

// TypeScript Types (inferred from schemas)
export type DepositDto = z.infer<typeof DepositSchema>;
export type CertificateDto = z.infer<typeof CertificateSchema>;
export type UndefinedDto = z.infer<typeof UndefinedSchema>;
export type GeminiOcrResponseDto = z.infer<typeof GeminiOcrResponseSchema>;
