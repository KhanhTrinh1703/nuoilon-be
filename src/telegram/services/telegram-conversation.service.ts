import { Injectable, Logger } from '@nestjs/common';

export interface ConversationState {
  type: 'deposit' | 'certificate';
  step:
    | 'awaiting_date'
    | 'awaiting_capital'
    | 'awaiting_certificates'
    | 'awaiting_price';
  data: {
    transactionDate?: string;
    capital?: number;
    numberOfCertificates?: number;
    price?: number;
  };
  createdAt: number;
}

/**
 * Service for managing user conversation state in Telegram bot
 * Handles conversation lifecycle, timeouts, and state management
 */
@Injectable()
export class TelegramConversationService {
  private static readonly CONVERSATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly logger = new Logger(TelegramConversationService.name);
  private conversations = new Map<number, ConversationState>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the conversation service and start cleanup interval
   */
  startCleanup(): void {
    // Start cleanup interval for stale conversations (check every minute)
    this.cleanupInterval = setInterval(
      () => this.cleanupStaleConversations(),
      60000,
    );
    this.logger.log('Conversation cleanup interval started');
  }

  /**
   * Stop the cleanup interval when service is destroyed
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('Conversation cleanup interval stopped');
    }
  }

  /**
   * Get conversation state for a user
   */
  getConversation(userId: number): ConversationState | undefined {
    return this.conversations.get(userId);
  }

  /**
   * Check if user has an active conversation
   */
  hasConversation(userId: number): boolean {
    return this.conversations.has(userId);
  }

  /**
   * Start a new conversation for a user
   */
  startConversation(
    userId: number,
    type: 'deposit' | 'certificate',
  ): ConversationState {
    const conversation: ConversationState = {
      type,
      step: 'awaiting_date',
      data: {},
      createdAt: Date.now(),
    };
    this.conversations.set(userId, conversation);
    this.logger.log(`Started ${type} conversation for user ${userId}`);
    return conversation;
  }

  /**
   * Update conversation state for a user
   */
  updateConversation(userId: number, state: ConversationState): void {
    this.conversations.set(userId, state);
  }

  /**
   * End and remove conversation for a user
   */
  endConversation(userId: number): void {
    this.conversations.delete(userId);
    this.logger.log(`Ended conversation for user ${userId}`);
  }

  /**
   * Cleanup stale conversations that have been inactive for more than 5 minutes
   * Called periodically to prevent memory leaks from abandoned conversations
   */
  private cleanupStaleConversations(): void {
    const now = Date.now();
    const staleUsers: number[] = [];

    for (const [userId, conversation] of this.conversations.entries()) {
      if (
        now - conversation.createdAt >
        TelegramConversationService.CONVERSATION_TIMEOUT_MS
      ) {
        staleUsers.push(userId);
      }
    }

    if (staleUsers.length > 0) {
      for (const userId of staleUsers) {
        this.conversations.delete(userId);
        this.logger.log(
          `Cleaned up stale conversation for user ${userId} (timeout after 5 minutes)`,
        );
      }
    }
  }
}
