import { randomUUID } from 'crypto';

/**
 * Generates a unique transaction ID for Telegram-originated transactions
 * @param type Transaction type (deposit or certificate)
 * @returns Unique transaction ID with UUID
 */
export function generateTransactionId(type: 'deposit' | 'certificate'): string {
  const uuid = randomUUID();
  const prefix = type === 'deposit' ? 'TG-DEP' : 'TG-CERT';
  return `${prefix}-${uuid}`;
}
