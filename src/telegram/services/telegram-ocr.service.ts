import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

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
          /* Lines 145-157 omitted */
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
    const transactionType = this.mapTransactionType(
      this.toSafeString(resultJson.transactionType),
    );
    const amount = this.formatCurrency(resultJson.amount);
    const date = this.formatDate(resultJson.transactionDate);

    const certificates = this.toSafeNumber(resultJson.certificates);
    const fundCode = this.toSafeString(resultJson.fundCode) || 'N/A';
    const note = this.toSafeString(resultJson.note) || 'N/A';

    const lines: string[] = [
      '🧾 *Kết quả OCR*',
      '',
      `📋 *Loại:* ${transactionType}`,
      `💰 *Số tiền:* ${amount}`,
      `📅 *Ngày:* ${date}`,
    ];

    if (certificates !== null) {
      lines.push(`🎫 *Số CCQ:* ${certificates.toLocaleString('vi-VN')}`);
    }

    if (fundCode !== 'N/A') {
      lines.push(`🏦 *Mã quỹ:* ${fundCode}`);
    }

    if (note !== 'N/A') {
      lines.push(`📝 *Ghi chú:* ${note}`);
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

  private mapTransactionType(transactionType: string): string {
    if (transactionType === 'DEPOSIT') {
      return 'Gửi tiền';
    }

    if (transactionType === 'CERTIFICATE') {
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
      const normalized = value.replace(/[,.\n+\s]/g, '');
      const parsed = Number(normalized);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }
}
