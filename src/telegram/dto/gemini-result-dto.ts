/**
 * Discriminated union type for OCR responses
 * Handles 3 cases: banking deposit, fund certificate, or undefined
 */
export type GeminiOcrResponseDto = DepositDto | CertificateDto | UndefinedDto;

export interface DepositDto {
  type: 'deposit';
  amount: string;
  currency: string | null;
  confidence: number;
}

export interface CertificateDto {
  type: 'certificate';
  matched_price: number;
  matched_quantity: number;
  confidence: number;
}

export interface UndefinedDto {
  type: 'undefined';
}
