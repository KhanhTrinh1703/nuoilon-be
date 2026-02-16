import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

export interface ParsedDepositOcrData {
  transactionDate: string;
  amount: number;
}

export interface ParsedCertificateOcrData {
  transactionDate: string;
  numberOfCertificates: number;
  price: number;
}

@Injectable()
export class TelegramOcrService {
  private readonly logger = new Logger(TelegramOcrService.name);

  async sendNeedConfirmMessage(
    bot: Telegraf,
    chatId: number,
    jobId: string,
    confirmToken: string,
    resultJson: Record<string, unknown>,
    warnings?: string[],
  ): Promise<{ message_id: number }> {
    const message = this.formatOcrResultMessage(resultJson, warnings);

    const sentMessage = await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Xác nhận',
              callback_data: `ocr_confirm_${jobId}_${confirmToken}`,
            },
          ],
          [
            {
              text: '❌ Hủy bỏ',
              callback_data: `ocr_reject_${jobId}_${confirmToken}`,
            },
          ],
        ],
      },
    });

    this.logger.log(
      `Sent OCR confirmation message for job=${jobId} to chat=${chatId}, messageId=${sentMessage.message_id}`,
    );

    return { message_id: sentMessage.message_id };
  }

  formatOcrResultMessage(
    resultJson: Record<string, unknown>,
    warnings?: string[],
  ): string {
    const rawType = this.toSafeString(resultJson.type).toLowerCase();
    const typeLabel = this.mapTransactionType(rawType);

    const confidence = this.toSafeNumber(resultJson.confidence);
    const confidenceText =
      confidence !== null ? `${confidence.toLocaleString('vi-VN')}` : 'N/A';

    const lines: string[] = ['🧾 *Kết quả OCR*', ''];

    if (rawType === 'deposit') {
      const amount = this.formatCurrency(resultJson.amount);
      const currency = this.toSafeString(resultJson.currency) || 'N/A';

      lines.push(`📋 *Loại:* ${typeLabel}`);
      lines.push(`💰 *Số tiền:* ${amount}`);
      lines.push(`💱 *Tiền tệ:* ${currency}`);
      lines.push(`🎯 *Độ tin cậy:* ${confidenceText}`);
    } else if (rawType === 'certificate') {
      const matchedPrice = this.toSafeNumber(resultJson.matched_price);
      const matchedQuantity = this.toSafeNumber(resultJson.matched_quantity);

      lines.push(`📋 *Loại:* ${typeLabel}`);
      lines.push(
        `💵 *Giá khớp:* ${
          matchedPrice !== null ? matchedPrice.toLocaleString('vi-VN') : 'N/A'
        }`,
      );
      lines.push(
        `🎫 *SL khớp:* ${
          matchedQuantity !== null
            ? matchedQuantity.toLocaleString('vi-VN')
            : 'N/A'
        }`,
      );
      lines.push(`🎯 *Độ tin cậy:* ${confidenceText}`);
    } else {
      lines.push('📋 *Loại:* Không xác định');
    }

    if (warnings && warnings.length > 0) {
      lines.push('');
      lines.push('⚠️ *Cảnh báo OCR:*');
      for (const warning of warnings) {
        lines.push(`- ${warning}`);
      }
    }

    lines.push('');
    lines.push('Vui lòng kiểm tra và chọn *Xác nhận* hoặc *Từ chối*.');

    return lines.join('\n');
  }

  resolveTransactionType(
    resultJson: Record<string, unknown>,
  ): 'deposit' | 'certificate' {
    const raw = this.toSafeString(resultJson.transactionType).toLowerCase();

    if (raw === 'deposit' || raw === 'certificate') {
      return raw;
    }

    throw new BadRequestException(
      `Unsupported transactionType: ${resultJson.transactionType as string}`,
    );
  }

  parseDepositResult(
    resultJson: Record<string, unknown>,
  ): ParsedDepositOcrData {
    const transactionDate = this.parseRequiredDate(
      resultJson.transactionDate ?? resultJson.date,
      'transactionDate',
    );

    const amount = this.parseRequiredNumber(
      resultJson.amount ?? resultJson.capital,
      'amount',
    );

    return {
      transactionDate,
      amount,
    };
  }

  parseCertificateResult(
    resultJson: Record<string, unknown>,
  ): ParsedCertificateOcrData {
    const transactionDate = this.parseRequiredDate(
      resultJson.transactionDate ?? resultJson.date,
      'transactionDate',
    );

    const numberOfCertificates = this.parseRequiredNumber(
      resultJson.numberOfCertificates ?? resultJson.certificates,
      'numberOfCertificates',
    );

    const price = this.parseRequiredNumber(resultJson.price, 'price');

    return {
      transactionDate,
      numberOfCertificates,
      price,
    };
  }

  buildConfirmedText(): string {
    return '✅ Đã xác nhận và lưu giao dịch';
  }

  buildRejectedText(): string {
    return '❌ Đã từ chối';
  }

  private parseRequiredDate(value: unknown, field: string): string {
    const text = this.toSafeString(value);
    if (!text) {
      throw new BadRequestException(`Missing required OCR field: ${field}`);
    }

    const date = new Date(text);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid OCR date for field: ${field}`);
    }

    return text;
  }

  private parseRequiredNumber(value: unknown, field: string): number {
    const parsed = this.toSafeNumber(value);
    if (parsed === null) {
      throw new BadRequestException(`Invalid OCR number for field: ${field}`);
    }

    return parsed;
  }

  private mapTransactionType(transactionType: string): string {
    if (transactionType === 'deposit') {
      return 'Gửi tiền';
    }

    if (transactionType === 'certificate') {
      return 'Mua chứng chỉ quỹ';
    }

    return transactionType || 'Không xác định';
  }

  private formatCurrency(value: unknown): string {
    const amount = this.toSafeNumber(value);
    if (amount === null) {
      return 'N/A';
    }

    return `${amount.toLocaleString('vi-VN')} VND`;
  }

  private formatDate(value: unknown): string {
    const text = this.toSafeString(value);
    if (!text) {
      return 'N/A';
    }

    const date = new Date(text);
    if (isNaN(date.getTime())) {
      return text;
    }

    return date.toLocaleDateString('vi-VN');
  }

  private toSafeString(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  }

  private toSafeNumber(value: unknown): number | null {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/[,\s]/g, '');
      const parsed = Number(normalized);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }
}
