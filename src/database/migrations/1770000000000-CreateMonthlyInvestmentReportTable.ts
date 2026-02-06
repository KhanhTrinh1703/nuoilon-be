import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMonthlyInvestmentReportTable1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'monthly_investment_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'reportMonth',
            type: 'varchar',
            length: '7',
          },
          {
            name: 'fundName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'totalCapital',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: '0',
          },
          {
            name: 'totalCertificates',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: '0',
          },
          {
            name: 'capitalInMonth',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: '0',
          },
          {
            name: 'certificatesInMonth',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: '0',
          },
          {
            name: 'latestFundPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: '0',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            name: 'UQ_monthly_investment_reports_month_fund',
            columnNames: ['reportMonth', 'fundName'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('monthly_investment_reports');
  }
}
