import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { UploadLog } from '../../database/entities/upload-log.entity';

export interface CreateUploadLogInput {
  telegramUserId: string;
  telegramMessageId: string;
  originalName: string;
  mimeType?: string;
  fileSize: number;
  oneDriveUrl: string;
}

@Injectable()
export class UploadLogRepository {
  constructor(
    @InjectRepository(UploadLog)
    private readonly repository: Repository<UploadLog>,
  ) {}

  async createUploadLog(input: CreateUploadLogInput): Promise<UploadLog> {
    const entity = this.repository.create({
      telegramUserId: input.telegramUserId,
      telegramMessageId: input.telegramMessageId,
      originalName: input.originalName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      oneDriveUrl: input.oneDriveUrl,
    });

    return this.repository.save(entity);
  }

  async countUploadsForUserBetween(
    telegramUserId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.repository.count({
      where: {
        telegramUserId,
        uploadedAt: Between(start, end),
      },
    });
  }
}
