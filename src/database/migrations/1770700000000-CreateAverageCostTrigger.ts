import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAverageCostTrigger1770700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_fund_average_cost()
      RETURNS TRIGGER AS $$
      DECLARE
        total_capital NUMERIC;
        total_certificates NUMERIC;
        average_cost NUMERIC;
      BEGIN
        SELECT
          COALESCE(SUM("numberOfFundCertificate" * COALESCE("price", 0)), 0),
          COALESCE(SUM("numberOfFundCertificate"), 0)
        INTO total_capital, total_certificates
        FROM "excel_transactions";

        IF total_certificates > 0 THEN
          average_cost := total_capital / total_certificates;
        ELSE
          average_cost := 0;
        END IF;

        INSERT INTO "fund_prices" ("name", "price", "averageCost", "createdAt", "updatedAt")
        VALUES ('E1VFVN30', 0, average_cost, NOW(), NOW())
        ON CONFLICT ("name") DO UPDATE
        SET "averageCost" = EXCLUDED."averageCost",
            "updatedAt" = NOW();

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_fund_average_cost_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "excel_transactions"
      FOR EACH STATEMENT
      EXECUTE FUNCTION update_fund_average_cost();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_fund_average_cost_trigger
      ON "excel_transactions";
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_fund_average_cost();
    `);
  }
}
