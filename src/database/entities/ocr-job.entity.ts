import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OcrJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  NEED_CONFIRM = 'NEED_CONFIRM',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

@Entity('ocr_jobs')
export class OcrJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status: OcrJobStatus;

  @Column({
    name: 'tg_file_unique_id',
    type: 'varchar',
    length: 128,
    unique: true,
  })
  tgFileUniqueId: string;

  @Column({ name: 'tg_chat_id', type: 'varchar', length: 64 })
  tgChatId: string;

  @Column({ name: 'tg_user_id', type: 'varchar', length: 64 })
  tgUserId: string;

  @Column({ name: 'storage_bucket', type: 'varchar', length: 128 })
  storageBucket: string;

  @Column({ name: 'storage_path', type: 'text' })
  storagePath: string;

  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  contentType?: string;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'int', default: 2 })
  maxAttempts: number;

  @Column({ name: 'ocr_result_json', type: 'jsonb', nullable: true })
  ocrResultJson?: Record<string, unknown>;

  @Column({
    name: 'confirm_token',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  confirmToken?: string;

  @Column({
    name: 'tg_sent_message_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  tgSentMessageId?: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId?: string;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({
    name: 'confirmed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  confirmedAt?: Date;

  @Column({
    name: 'rejected_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  rejectedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
