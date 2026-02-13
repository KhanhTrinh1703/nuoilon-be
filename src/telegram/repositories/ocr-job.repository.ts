import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OcrJob, OcrJobStatus } from '../../database/entities/ocr-job.entity';

export interface CreateOcrJobInput {
  tgFileUniqueId: string;
  tgChatId: string;
  tgUserId: string;
  storageBucket: string;
  storagePath: string;
  contentType?: string;
  status?: OcrJobStatus;
  maxAttempts?: number;
}

export interface MarkNeedConfirmInput {
  resultJson: Record<string, unknown>;
  provider: string;
  model: string;
  warnings?: string[];
  confirmToken: string;
}

@Injectable()
export class OcrJobRepository {
  constructor(
    @InjectRepository(OcrJob)
    private readonly repository: Repository<OcrJob>,
  ) {}

  async create(input: CreateOcrJobInput): Promise<OcrJob> {
    const entity = this.repository.create({
      tgFileUniqueId: input.tgFileUniqueId,
      tgChatId: input.tgChatId,
      tgUserId: input.tgUserId,
      storageBucket: input.storageBucket,
      storagePath: input.storagePath,
      contentType: input.contentType,
      status: input.status ?? OcrJobStatus.PENDING,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 2,
    });

    return this.repository.save(entity);
  }

  async findOrCreatePending(input: CreateOcrJobInput): Promise<OcrJob> {
    const existing = await this.findByIdempotencyKey(input.tgFileUniqueId);
    if (existing) {
      return existing;
    }

    try {
      return await this.create({
        ...input,
        status: input.status ?? OcrJobStatus.PENDING,
      });
    } catch (err: unknown) {
      const code = (err as { code?: unknown } | null)?.code;
      if (code === '23505') {
        const after = await this.findByIdempotencyKey(input.tgFileUniqueId);
        if (after) return after;
      }
      throw err;
    }
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<OcrJob | null> {
    return this.repository.findOne({
      where: { tgFileUniqueId: idempotencyKey },
    });
  }

  async findById(id: string): Promise<OcrJob | null> {
    return this.repository.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: OcrJobStatus): Promise<void> {
    await this.repository.update({ id }, { status });
  }

  async incrementAttempts(id: string): Promise<OcrJob | null> {
    await this.repository.increment({ id }, 'attempts', 1);
    return this.findById(id);
  }

  async markNeedConfirm(
    id: string,
    input: MarkNeedConfirmInput,
  ): Promise<OcrJob | null> {
    await this.repository.update(
      { id },
      {
        status: OcrJobStatus.NEED_CONFIRM,
        /* Lines 125-129 omitted */
        confirmToken: input.confirmToken,
      },
    );

    return this.findById(id);
  }

  async updateSentMessageId(
    id: string,
    tgSentMessageId: string,
  ): Promise<void> {
    await this.repository.update({ id }, { tgSentMessageId });
  }

  async markConfirmed(
    id: string,
    transactionId: string,
    confirmedAt: Date,
  ): Promise<OcrJob | null> {
    await this.repository.update(
      { id },
      {
        status: OcrJobStatus.CONFIRMED,
        /* Lines 149-150 omitted */
        confirmedAt,
      },
    );

    return this.findById(id);
  }

  async markRejected(id: string, rejectedAt: Date): Promise<OcrJob | null> {
    await this.repository.update(
      { id },
      {
        status: OcrJobStatus.REJECTED,
        rejectedAt,
      },
    );

    return this.findById(id);
  }
}
