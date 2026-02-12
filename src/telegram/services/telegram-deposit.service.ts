import { format } from 'date-fns';
import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { DepositTransactionRepository } from '../repositories/deposit-transaction.repository';
import {
  TelegramConversationService,
  ConversationState,
} from './telegram-conversation.service';
import {
  validateDate,
  validateAmount,
  formatVND,
} from '../utils/validation.util';
import { generateTransactionId } from '../utils/transaction-id.util';

/**
 * Service for handling deposit transaction flow in Telegram bot
 * Manages the multi-step deposit input process
 */
@Injectable()
export class TelegramDepositService {
  private readonly logger = new Logger(TelegramDepositService.name);

  constructor(
    private readonly depositTransactionRepository: DepositTransactionRepository,
    private readonly conversationService: TelegramConversationService,
  ) {}

  /**
   * Start deposit flow - Show date selection buttons
   */
  async startDepositFlow(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;
      if (!userId) return;

      // Initialize deposit conversation
      this.conversationService.startConversation(userId, 'deposit');

      // Show date selection buttons
      await ctx.reply('Chọn ngày giao dịch:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Hôm nay', callback_data: 'deposit_date_today' }],
            [
              {
                text: '📆 Chọn ngày khác',
                callback_data: 'deposit_date_custom',
              },
            ],
          ],
        },
      });

      this.logger.log(`User ${userId} started deposit flow`);
    } catch (error) {
      this.logger.error('Error in startDepositFlow:', error);
      await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  }

  /**
   * Handle "Today" date selection for deposit
   */
  async handleTodayDate(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;
      if (!userId) return;

      const conversation = this.conversationService.getConversation(userId);
      if (!conversation || conversation.type !== 'deposit') {
        await ctx.reply(
          '⚠️ Phiên làm việc không hợp lệ. Vui lòng nhập /input để bắt đầu lại.',
        );
        return;
      }

      // Set today's date
      const today = format(new Date(), 'yyyy-MM-dd');
      conversation.data.transactionDate = today;
      conversation.step = 'awaiting_capital';
      this.conversationService.updateConversation(userId, conversation);

      await ctx.reply(
        `✅ Ngày giao dịch: ${format(new Date(), 'dd/MM/yyyy')}\n\nNhập số tiền nạp (VNĐ):`,
      );

      this.logger.log(`User ${userId} selected today for deposit`);
    } catch (error) {
      this.logger.error('Error in handleTodayDate:', error);
      await ctx.reply('❌ Đã xảy ra lỗi.');
    }
  }

  /**
   * Handle "Custom date" selection for deposit
   */
  async handleCustomDate(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;
      if (!userId) return;

      const conversation = this.conversationService.getConversation(userId);
      if (!conversation || conversation.type !== 'deposit') {
        await ctx.reply(
          '⚠️ Phiên làm việc không hợp lệ. Vui lòng nhập /input để bắt đầu lại.',
        );
        return;
      }

      // Keep step as awaiting_date for text input
      await ctx.reply('Nhập ngày giao dịch (dd/MM/yyyy):');

      this.logger.log(`User ${userId} chose custom date for deposit`);
    } catch (error) {
      this.logger.error('Error in handleCustomDate:', error);
      await ctx.reply('❌ Đã xảy ra lỗi.');
    }
  }

  /**
   * Handle text input for deposit flow
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
          await ctx.reply(dateResult.error!);
          return;
        }

        // Store date and move to next step
        conversation.data.transactionDate = format(
          dateResult.date!,
          'yyyy-MM-dd',
        );
        conversation.step = 'awaiting_capital';
        this.conversationService.updateConversation(userId, conversation);

        await ctx.reply(
          `✅ Ngày giao dịch: ${format(dateResult.date!, 'dd/MM/yyyy')}\n\nNhập số tiền nạp (VNĐ):`,
        );
        this.logger.log(
          `User ${userId} entered date: ${conversation.data.transactionDate}`,
        );
        break;
      }

      case 'awaiting_capital': {
        // Validate amount
        const amountResult = validateAmount(text);
        if (!amountResult.valid) {
          await ctx.reply(amountResult.error!);
          return;
        }

        // Save to database
        await this.saveTransaction(
          ctx,
          userId,
          conversation,
          amountResult.amount!,
        );
        break;
      }

      default:
        // Invalid step for deposit flow
        break;
    }
  }

  /**
   * Save deposit transaction to database
   */
  private async saveTransaction(
    ctx: Context,
    userId: number,
    conversation: ConversationState,
    capital: number,
  ): Promise<void> {
    try {
      const transactionId = generateTransactionId('deposit');
      const transactionDate = conversation.data.transactionDate!;

      // Save to database
      await this.depositTransactionRepository.upsertTransaction({
        transactionDate,
        capital,
        transactionId,
      });

      // Format confirmation message
      const dateFormatted = format(new Date(transactionDate), 'dd/MM/yyyy');
      const capitalFormatted = formatVND(capital);

      const confirmationMessage = `✅ Đã lưu giao dịch nạp tiền

📅 Ngày: ${dateFormatted}
💰 Số tiền: ${capitalFormatted} VNĐ
🔖 Mã GD: ${transactionId}`;

      await ctx.reply(confirmationMessage);

      // Clear conversation
      this.conversationService.endConversation(userId);

      this.logger.log(
        `User ${userId} completed deposit: ${capital} VND on ${transactionDate}`,
      );
    } catch (error) {
      this.logger.error('Error saving deposit transaction:', error);
      await ctx.reply(
        '❌ Lỗi khi lưu giao dịch. Vui lòng kiểm tra và thử lại.',
      );

      // Clear conversation on error
      this.conversationService.endConversation(userId);
    }
  }
}
