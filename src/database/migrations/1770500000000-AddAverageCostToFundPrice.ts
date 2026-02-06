import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAverageCostToFundPrice1770500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'fund_prices',
      new TableColumn({
        name: 'averageCost',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('fund_prices', 'averageCost');
  }
}
