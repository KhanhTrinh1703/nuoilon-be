import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUploadLogTable1769712000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'upload_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'telegram_user_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'telegram_message_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'original_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          { name: 'file_size', type: 'bigint', isNullable: false },
          { name: 'onedrive_url', type: 'text', isNullable: false },
          {
            name: 'uploaded_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'upload_logs',
      new TableIndex({
        name: 'IDX_UPLOAD_LOGS_TELEGRAM_USER',
        columnNames: ['telegram_user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('upload_logs', 'IDX_UPLOAD_LOGS_TELEGRAM_USER');
    await queryRunner.dropTable('upload_logs');
  }
}
