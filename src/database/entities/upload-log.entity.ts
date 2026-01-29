import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('upload_logs')
export class UploadLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'telegram_user_id', type: 'varchar', length: 64 })
  telegramUserId: string;

  @Column({ name: 'telegram_message_id', type: 'varchar', length: 64 })
  telegramMessageId: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 64, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'storage_url', type: 'text' })
  storageUrl: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
