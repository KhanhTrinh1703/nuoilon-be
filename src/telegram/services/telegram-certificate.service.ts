/* eslint-disable @typescript-eslint/no-floating-promises */
import { format } from 'date-fns';
import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { CertificateTransactionRepository } from '../repositories/certificate-transaction.repository';
import {
  TelegramConversationService,
  ConversationState,
} from './telegram-conversation.service';
import {
  validateDate,
  validateAmount,
  validateCertificateQuantity,
  formatVND,
  formatCertificateQuantity,
} from '../utils/validation.util';
import { generateTransactionId } from '../utils/transaction-id.util';

/**
 * Service for handling certificate transaction flow in Telegram bot
 * Manages the multi-step certificate purchase input process
 */
@Injectable()
export class TelegramCertificateService {
  private readonly logger = new Logger(TelegramCertificateService.name);

  constructor(
    private readonly certificateTransactionRepository: CertificateTransactionRepository,
    private readonly conversationService: TelegramConversationService,
  ) {}

  /**
   * Start certificate flow - Show date selection buttons
   */
  async startCertificateFlow(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;
      if (!userId) return;

      // Initialize certificate conversation
      this.conversationService.startConversation(userId, 'certificate');

      // Show date selection buttons
      await ctx.reply('Chọn ngày giao dịch:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Hôm nay', callback_data: 'certificate_date_today' }],
            [
              {
                text: '📆 Chọn ngày khác',
                callback_data: 'certificate_date_custom',
              },
            ],
          ],
        },
      });

      this.logger.log(`User ${userId} started certificate flow`);
    } catch (error) {
      this.logger.error('Error in startCertificateFlow:', error);
      await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  }

  /**
   * Handle "Today" date selection for certificate
   */
  async handleTodayDate(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;
      if (!userId) return;

      const conversation = this.conversationService.getConversation(userId);
      if (!conversation || conversation.type !== 'certificate') {
        ctx.reply(
          '⚠️ Phiên làm việc không hợp lệ. Vui lòng nhập /input để bắt đầu lại.',
        );
        return;
      }

      // Set today's date
      const today = format(new Date(), 'yyyy-MM-dd');
      conversation.data.transactionDate = today;
      conversation.step = 'awaiting_certificates';
      this.conversationService.updateConversation(userId, conversation);

      await ctx.reply(
        `✅ Ngày giao dịch: ${format(new Date(), 'dd/MM/yyyy')}\n\nNhập số lượng chứng chỉ quỹ:`,
      );

      this.logger.log(`User ${userId} selected today for certificate`);
    } catch (error) {
      this.logger.error('Error in handleTodayDate:', error);
      await ctx.reply('❌ Đã xảy ra lỗi.');
    }
  }

  /**
   * Handle "Custom date" selection for certificate
   */
  async handleCustomDate(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;
      if (!userId) return;

      const conversation = this.conversationService.getConversation(userId);
      if (!conversation || conversation.type !== 'certificate') {
        ctx.reply(
          '⚠️ Phiên làm việc không hợp lệ. Vui lòng nhập /input để bắt đầu lại.',
        );
        return;
      }

      // Keep step as awaiting_date for text input
      await ctx.reply('Nhập ngày giao dịch (dd/MM/yyyy):');

      this.logger.log(`User ${userId} chose custom date for certificate`);
    } catch (error) {
      this.logger.error('Error in handleCustomDate:', error);
      await ctx.reply('❌ Đã xảy ra lỗi.');
    }
  }

  /**
   * Handle text input for certificate flow
   */
  async handleTextInput(
    ctx: Context,
    userId: number,
    conversation: ConversationState,
    text: string,
  ): Promise<void> {
    switch (conversation.step) {
      case 'awaiting_date': {
        // Validate date
        const dateResult = validateDate(text);
        if (!dateResult.valid) {
          ctx.reply(dateResult.error!);
          return;
        }

        // Store date and move to next step
        conversation.data.transactionDate = format(
          dateResult.date!,
          'yyyy-MM-dd',
        );
        conversation.step = 'awaiting_certificates';
        this.conversationService.updateConversation(userId, conversation);

        await ctx.reply(
          `✅ Ngày giao dịch: ${format(dateResult.date!, 'dd/MM/yyyy')}\n\nNhập số lượng chứng chỉ quỹ:`,
        );
        this.logger.log(
          `User ${userId} entered date: ${conversation.data.transactionDate}`,
        );
        break;
      }

      case 'awaiting_certificates': {
        // Validate certificate quantity
        const quantityResult = validateCertificateQuantity(text);
        if (!quantityResult.valid) {
          ctx.reply(quantityResult.error!);
          return;
        }

        // Store quantity and move to next step
        conversation.data.numberOfCertificates = quantityResult.quantity;
        conversation.step = 'awaiting_price';
        this.conversationService.updateConversation(userId, conversation);

        await ctx.reply(
          `✅ Số lượng CCQ: ${formatCertificateQuantity(quantityResult.quantity!)}\n\nNhập giá chứng chỉ (VNĐ):`,
        );
        this.logger.log(
          `User ${userId} entered quantity: ${quantityResult.quantity}`,
        );
        break;
      }

      case 'awaiting_price': {
        // Validate price
        const priceResult = validateAmount(text);
        if (!priceResult.valid) {
          ctx.reply(priceResult.error!);
          return;
        }

        // Save to database
        await this.saveTransaction(
          ctx,
          userId,
          conversation,
          priceResult.amount!,
        );
        break;
      }

      default:
        // Invalid step for certificate flow
        break;
    }
  }

  /**
   * Save certificate transaction to database
   */
  private async saveTransaction(
    ctx: Context,
    userId: number,
    conversation: ConversationState,
    price: number,
  ): Promise<void> {
    try {
      const transactionId = generateTransactionId('certificate');
      const transactionDate = conversation.data.transactionDate!;
      const numberOfCertificates = conversation.data.numberOfCertificates!;

      // Save to database
      await this.certificateTransactionRepository.upsertTransaction({
        transactionDate,
        numberOfCertificates,
        price,
        transactionId,
      });

      // Calculate total amount
      const totalAmount = numberOfCertificates * price;

      // Format confirmation message
      const dateFormatted = format(new Date(transactionDate), 'dd/MM/yyyy');
      const priceFormatted = formatVND(price);
      const totalFormatted = formatVND(totalAmount);

      const confirmationMessage = `✅ Đã lưu giao dịch mua chứng chỉ quỹ

📅 Ngày: ${dateFormatted}
📊 Số lượng CCQ: ${formatCertificateQuantity(numberOfCertificates)}
💵 Giá CCQ: ${priceFormatted} VNĐ
💰 Tổng tiền: ${totalFormatted} VNĐ
🔖 Mã GD: ${transactionId}`;

      await ctx.reply(confirmationMessage);

      // Clear conversation
      this.conversationService.endConversation(userId);

      this.logger.log(
        `User ${userId} completed certificate: ${numberOfCertificates} x ${price} VND on ${transactionDate}`,
      );
    } catch (error) {
      this.logger.error('Error saving certificate transaction:', error);
      await ctx.reply(
        '❌ Lỗi khi lưu giao dịch. Vui lòng kiểm tra và thử lại.',
      );

      // Clear conversation on error
      this.conversationService.endConversation(userId);
    }
  }
}
