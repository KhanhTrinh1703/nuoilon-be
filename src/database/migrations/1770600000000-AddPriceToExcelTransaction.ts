import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPriceToExcelTransaction1770600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'excel_transactions',
      new TableColumn({
        name: 'price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('excel_transactions', 'price');
  }
}
