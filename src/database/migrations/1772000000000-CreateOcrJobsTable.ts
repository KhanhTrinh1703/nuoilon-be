import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOcrJobsTable1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ocr_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
            default: `'PENDING'`,
          },
          {
            name: 'tg_file_unique_id',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'tg_chat_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'tg_user_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'storage_bucket',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'storage_path',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'content_type',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'attempts',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'max_attempts',
            type: 'int',
            isNullable: false,
            default: 2,
          },
          {
            name: 'ocr_result_json',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'confirm_token',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'tg_sent_message_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'transaction_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'last_error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confirmed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'rejected_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'ocr_jobs',
      new TableIndex({
        name: 'UQ_OCR_JOBS_TG_FILE_UNIQUE_ID',
        columnNames: ['tg_file_unique_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'ocr_jobs',
      new TableIndex({
        name: 'IDX_OCR_JOBS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'ocr_jobs',
      new TableIndex({
        name: 'IDX_OCR_JOBS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('ocr_jobs', 'IDX_OCR_JOBS_CREATED_AT');
    await queryRunner.dropIndex('ocr_jobs', 'IDX_OCR_JOBS_STATUS');
    await queryRunner.dropIndex('ocr_jobs', 'UQ_OCR_JOBS_TG_FILE_UNIQUE_ID');
    await queryRunner.dropTable('ocr_jobs');
  }
}
