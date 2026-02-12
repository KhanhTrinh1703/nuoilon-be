import { parse, isValid } from 'date-fns';

/**
 * Validates a date string in various formats
 * @param text User input date string
 * @returns Validation result with parsed date
 */
export function validateDate(text: string): {
  valid: boolean;
  date?: Date;
  error?: string;
} {
  const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd'];

  for (const formatStr of formats) {
    try {
      const parsed = parse(text, formatStr, new Date());
      if (isValid(parsed)) {
        return { valid: true, date: parsed };
      }
    } catch {
      // Try next format
    }
  }

  return {
    valid: false,
    error:
      '❌ Ngày không hợp lệ. Vui lòng nhập theo định dạng dd/MM/yyyy (ví dụ: 15/01/2024)',
  };
}

/**
 * Validates an amount/price value
 * @param text User input amount string
 * @returns Validation result with parsed amount
 */
export function validateAmount(text: string): {
  valid: boolean;
  amount?: number;
  error?: string;
} {
  // Remove formatting characters (dots, commas, spaces)
  const cleaned = text.replace(/[,.\s]/g, '');
  const amount = parseFloat(cleaned);

  if (isNaN(amount) || amount <= 0) {
    return {
      valid: false,
      error: '❌ Số tiền không hợp lệ. Vui lòng nhập số dương (ví dụ: 5000000)',
    };
  }

  return { valid: true, amount };
}

/**
 * Formats a number as Vietnamese Dong currency
 * @param amount Amount to format
 * @returns Formatted string with thousand separators
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

/**
 * Validates certificate quantity (supports decimal numbers)
 * @param text User input quantity string
 * @returns Validation result with parsed quantity
 */
export function validateCertificateQuantity(text: string): {
  valid: boolean;
  quantity?: number;
  error?: string;
} {
  // Replace comma with dot for decimal separator
  const normalized = text.replace(/,/g, '.');

  // Remove thousand separators (spaces)
  const cleaned = normalized.replace(/\s/g, '');

  const quantity = parseFloat(cleaned);

  if (isNaN(quantity) || quantity <= 0) {
    return {
      valid: false,
      error:
        '❌ Số lượng không hợp lệ. Vui lòng nhập số dương (ví dụ: 125.5 hoặc 100)',
    };
  }

  return { valid: true, quantity };
}

/**
 * Formats certificate quantity (show as integer if whole number, otherwise 2 decimals)
 * @param quantity Certificate quantity to format
 * @returns Formatted string
 */
export function formatCertificateQuantity(quantity: number): string {
  // Check if it's a whole number
  if (Number.isInteger(quantity)) {
    return quantity.toString();
  }
  // Show 2 decimal places
  return quantity.toFixed(2);
}
