import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitExcelTransactionTables1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "deposit_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "transactionDate" timestamp NOT NULL,
        "capital" decimal(15,2) NOT NULL,
        "transactionId" varchar(255) NOT NULL UNIQUE,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "certificate_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "transactionDate" timestamp NOT NULL,
        "numberOfCertificates" decimal(15,2) NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "transactionId" varchar(255) NOT NULL UNIQUE,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "orphan_excel_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "transactionDate" timestamp NULL,
        "capital" decimal(15,2) NULL,
        "numberOfFundCertificate" decimal(15,2) NULL,
        "price" decimal(10,2) NULL,
        "transactionId" varchar(255) NULL,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      INSERT INTO "deposit_transactions" (
        "id",
        "transactionDate",
        "capital",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "id",
        "transactionDate",
        "capital",
        COALESCE("transactionId", gen_random_uuid()::text),
        "createdAt",
        "updatedAt"
      FROM "excel_transactions"
      WHERE "capital" IS NOT NULL
        AND ("numberOfFundCertificate" IS NULL OR "price" IS NULL);
    `);

    await queryRunner.query(`
      INSERT INTO "certificate_transactions" (
        "id",
        "transactionDate",
        "numberOfCertificates",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "id",
        "transactionDate",
        "numberOfFundCertificate",
        "price",
        COALESCE("transactionId", gen_random_uuid()::text),
        "createdAt",
        "updatedAt"
      FROM "excel_transactions"
      WHERE "capital" IS NULL
        AND "numberOfFundCertificate" IS NOT NULL
        AND "price" IS NOT NULL;
    `);

    await queryRunner.query(`
      INSERT INTO "deposit_transactions" (
        "transactionDate",
        "capital",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "transactionDate",
        "capital",
        gen_random_uuid()::text,
        "createdAt",
        "updatedAt"
      FROM "excel_transactions"
      WHERE "capital" IS NOT NULL
        AND "numberOfFundCertificate" IS NOT NULL
        AND "price" IS NOT NULL;
    `);

    await queryRunner.query(`
      INSERT INTO "certificate_transactions" (
        "transactionDate",
        "numberOfCertificates",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "transactionDate",
        "numberOfFundCertificate",
        "price",
        gen_random_uuid()::text,
        "createdAt",
        "updatedAt"
      FROM "excel_transactions"
      WHERE "capital" IS NOT NULL
        AND "numberOfFundCertificate" IS NOT NULL
        AND "price" IS NOT NULL;
    `);

    await queryRunner.query(`
      INSERT INTO "orphan_excel_transactions" (
        "id",
        "transactionDate",
        "capital",
        "numberOfFundCertificate",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "id",
        "transactionDate",
        "capital",
        "numberOfFundCertificate",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      FROM "excel_transactions"
      WHERE "capital" IS NULL
        AND ("numberOfFundCertificate" IS NULL OR "price" IS NULL);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "excel_transactions" (
        "id",
        "transactionDate",
        "capital",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "id",
        "transactionDate",
        "capital",
        "transactionId",
        "createdAt",
        "updatedAt"
      FROM "deposit_transactions";
    `);

    await queryRunner.query(`
      INSERT INTO "excel_transactions" (
        "id",
        "transactionDate",
        "numberOfFundCertificate",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "id",
        "transactionDate",
        "numberOfCertificates",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      FROM "certificate_transactions";
    `);

    await queryRunner.query(`
      INSERT INTO "excel_transactions" (
        "id",
        "transactionDate",
        "capital",
        "numberOfFundCertificate",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "id",
        "transactionDate",
        "capital",
        "numberOfFundCertificate",
        "price",
        "transactionId",
        "createdAt",
        "updatedAt"
      FROM "orphan_excel_transactions";
    `);

    await queryRunner.query('DROP TABLE "deposit_transactions";');
    await queryRunner.query('DROP TABLE "certificate_transactions";');
    await queryRunner.query('DROP TABLE "orphan_excel_transactions";');
  }
}
