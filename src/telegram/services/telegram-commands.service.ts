/* eslint-disable @typescript-eslint/no-floating-promises */
import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { FundPriceRepository } from '../repositories/fund-price.repository';
import { DepositTransactionRepository } from '../repositories/deposit-transaction.repository';
import { CertificateTransactionRepository } from '../repositories/certificate-transaction.repository';
import { TelegramConversationService } from './telegram-conversation.service';
import { GeminiService } from 'src/common/services/ai/gemini.service';
import { CryptoPriceService } from '../../crypto/crypto-price.service';

/**
 * Service for handling basic Telegram bot commands
 * Handles: /hi, /reports, /cancel, /crypto
 */
@Injectable()
export class TelegramCommandsService {
  private readonly logger = new Logger(TelegramCommandsService.name);

  constructor(
    private readonly fundPriceRepository: FundPriceRepository,
    private readonly depositTransactionRepository: DepositTransactionRepository,
    private readonly certificateTransactionRepository: CertificateTransactionRepository,
    private readonly conversationService: TelegramConversationService,
    private readonly geminiService: GeminiService,
    private readonly cryptoPriceService: CryptoPriceService,
  ) {}

  /**
   * Handle /hi command - Simple greeting
   */
  async handleHiCommand(ctx: Context): Promise<void> {
    const greeting = await this.geminiService.greet();
    ctx.reply(greeting.message);
  }

  /**
   * Handle /crypto command - List live crypto prices
   */
  async handleCryptoCommand(ctx: Context): Promise<void> {
    try {
      const prices = await this.cryptoPriceService.getAllPrices();
      const lines = prices.map(
        (p) =>
          `*${p.name}*: $${p.price.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`,
      );

      await ctx.reply(`💰 *Giá Crypto hiện tại*\n\n${lines.join('\n')}`, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      this.logger.error('Error fetching crypto prices', error);
      await ctx.reply(
        '❌ Không thể lấy giá crypto lúc này. Vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Handle /reports command - Generate investment summary report
   */
  async handleReportsCommand(ctx: Context): Promise<void> {
    try {
      const depositMonths =
        await this.depositTransactionRepository.getDistinctMonths();
      const certificateMonths =
        await this.certificateTransactionRepository.getDistinctMonths();
      const allMonths = new Set([...depositMonths, ...certificateMonths]);
      const investmentMonths = allMonths.size;
      const totalCapital =
        await this.depositTransactionRepository.getTotalCapital();
      const fundCertificates =
        await this.certificateTransactionRepository.getTotalNumberOfCertificates();

      const fundPrice = await this.fundPriceRepository.findByName('E1VFVN30');

      if (!fundPrice) {
        ctx.reply('❌ Không tìm thấy giá quỹ E1VFVN30. Vui lòng thử lại sau.');
        return;
      }

      // Calculate metrics
      const navValue = Number(fundCertificates) * Number(fundPrice.price);
      const averageCost = Number(fundPrice.averageCost ?? 0);
      const hasAverageCost = averageCost > 0;
      const profitLoss = hasAverageCost
        ? ((Number(fundPrice.price) - averageCost) / averageCost) * 100
        : null;

      const formatNumber = (num: number) =>
        num.toLocaleString('vi-VN', {
          maximumFractionDigits: 0,
        });

      const formatDecimalNumber = (num: number) =>
        num.toLocaleString('vi-VN', {
          maximumFractionDigits: 2,
        });

      const formatTimestamp = (date: Date) =>
        date.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'Asia/Ho_Chi_Minh',
        });

      const averageCostDisplay = hasAverageCost
        ? `${formatNumber(averageCost)}`
        : 'Chưa có dữ liệu';

      const profitLossLine = hasAverageCost
        ? `- ${profitLoss! >= 0 ? '✅ *Lợi nhuận:*' : '❌ *Lỗ:*'} ${formatDecimalNumber(Math.abs(profitLoss!))}%`
        : '- *Lợi nhuận:* Chưa có dữ liệu giá vốn';

      const message =
        `📊 *BÁO CÁO QUỸ ĐẦU TƯ E1VFVN30*\n\n` +
        `- *Thời gian đầu tư:* ${investmentMonths} tháng \n` +
        `- *Tổng vốn:* ${formatNumber(totalCapital)} VNĐ\n` +
        `- *Giá trị NAV:* ${formatNumber(navValue)} VNĐ\n` +
        `- *Số CCQ:* ${formatNumber(fundCertificates)}\n` +
        `- *Giá vốn:* ${averageCostDisplay}\n` +
        `- *Giá CCQ:* ${formatNumber(Number(fundPrice.price))}\n` +
        `${profitLossLine}\n\n` +
        `_Giá thị trường cập nhật lúc ${formatTimestamp(fundPrice.updatedAt)}_`;

      ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Error generating report:', error);
      ctx.reply('❌ Lỗi khi tạo báo cáo. Vui lòng thử lại sau.');
    }
  }

  /**
   * Handle /cancel command - Cancel active conversation
   */
  async handleCancelCommand(ctx: Context): Promise<void> {
    try {
      const userId = ctx.from?.id;
      if (!userId) {
        ctx.reply('❌ Không thể xác định người dùng.');
        return;
      }

      if (this.conversationService.hasConversation(userId)) {
        this.conversationService.endConversation(userId);
        await ctx.reply('✅ Đã hủy giao dịch.');
        this.logger.log(`User ${userId} cancelled conversation`);
      } else {
        await ctx.reply('⚠️ Bạn không có giao dịch nào đang thực hiện.');
      }
    } catch (error) {
      this.logger.error('Error in /cancel command:', error);
      ctx.reply('❌ Đã xảy ra lỗi.');
    }
  }
}
