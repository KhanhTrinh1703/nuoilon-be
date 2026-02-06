import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ExcelTransaction } from '../src/database/entities/excel-transaction.entity';
import { FundPrice } from '../src/database/entities/fund-price.entity';
import { MonthlyInvestmentReport } from '../src/database/entities/monthly-investment-report.entity';

dotenv.config();

type AggregateResult = {
  capitalInMonth: number;
  certificatesInMonth: number;
  totalCapital: number;
  totalCertificates: number;
};

function isLastDayOfMonth(date: Date): boolean {
  const test = new Date(date);
  test.setDate(test.getDate() + 1);
  return test.getDate() === 1;
}

function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
}

async function createDataSource(): Promise<DataSource> {
  const databaseUrl = process.env.DATABASE_URL;

  const baseOptions = databaseUrl
    ? {
        type: 'postgres' as const,
        url: databaseUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'nuoilon',
      };

  const dataSource = new DataSource({
    ...baseOptions,
    entities: [ExcelTransaction, FundPrice, MonthlyInvestmentReport],
    synchronize: false,
  });

  await dataSource.initialize();
  return dataSource;
}

async function aggregateMonthlyTransactions(
  dataSource: DataSource,
  month: string,
): Promise<AggregateResult> {
  const [yearValue, monthValue] = month.split('-');
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;

  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  console.log(
    `🔍 Aggregating transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`,
  );

  const monthlyRaw = await dataSource
    .getRepository(ExcelTransaction)
    .createQueryBuilder('transaction')
    .select('COALESCE(SUM(transaction.capital), 0)', 'capitalInMonth')
    .addSelect(
      'COALESCE(SUM(transaction.numberOfFundCertificate), 0)',
      'certificatesInMonth',
    )
    .where('transaction.transactionDate IS NOT NULL')
    .andWhere('transaction.transactionDate >= :startDate', { startDate })
    .andWhere('transaction.transactionDate < :endDate', { endDate })
    .getRawOne<{ capitalInMonth: string; certificatesInMonth: string }>();

  const cumulativeRaw = await dataSource
    .getRepository(ExcelTransaction)
    .createQueryBuilder('transaction')
    .select('COALESCE(SUM(transaction.capital), 0)', 'totalCapital')
    .addSelect(
      'COALESCE(SUM(transaction.numberOfFundCertificate), 0)',
      'totalCertificates',
    )
    .where('transaction.transactionDate IS NOT NULL')
    .andWhere('transaction.transactionDate < :endDate', { endDate })
    .getRawOne<{ totalCapital: string; totalCertificates: string }>();

  return {
    capitalInMonth: parseFloat(monthlyRaw?.capitalInMonth ?? '0'),
    certificatesInMonth: parseFloat(monthlyRaw?.certificatesInMonth ?? '0'),
    totalCapital: parseFloat(cumulativeRaw?.totalCapital ?? '0'),
    totalCertificates: parseFloat(cumulativeRaw?.totalCertificates ?? '0'),
  };
}

async function upsertMonthlyReport(
  dataSource: DataSource,
  payload: {
    reportMonth: string;
    fundName: string;
    totalCapital: number;
    totalCertificates: number;
    capitalInMonth: number;
    certificatesInMonth: number;
    latestFundPrice: number;
  },
): Promise<void> {
  const repository = dataSource.getRepository(MonthlyInvestmentReport);
  const existing = await repository.findOne({
    where: {
      reportMonth: payload.reportMonth,
      fundName: payload.fundName,
    },
  });

  if (existing) {
    repository.merge(existing, payload);
    await repository.save(existing);
    console.log(
      `✏️  Updated monthly report for ${payload.reportMonth} (${payload.fundName}).`,
    );
    return;
  }

  const report = repository.create(payload);
  await repository.save(report);
  console.log(
    `🆕 Created monthly report for ${payload.reportMonth} (${payload.fundName}).`,
  );
}

async function run(): Promise<void> {
  const today = new Date();
  const fundName = process.env.REPORT_FUND_NAME || 'E1VFVN30';

  if (!isLastDayOfMonth(today)) {
    console.log(
      'ℹ️  Skipping monthly-report script because today is not the last day of the month.',
    );
    process.exit(0);
  }

  const reportMonth = getMonthKey(today);
  console.log(`📆 Generating report for ${reportMonth} (${fundName}).`);

  const dataSource = await createDataSource();
  console.log('✅ Database connected');

  try {
    const aggregates = await aggregateMonthlyTransactions(
      dataSource,
      reportMonth,
    );
    const fundPrice = await dataSource.getRepository(FundPrice).findOne({
      where: { name: fundName },
      order: { updatedAt: 'DESC' },
    });

    if (!fundPrice) {
      console.error(
        `❌ Fund price not found for ${fundName}. Make sure crawl-fund-price.ts ran recently.`,
      );
      process.exit(1);
    }

    const latestFundPrice = Number(fundPrice.price);

    await upsertMonthlyReport(dataSource, {
      reportMonth,
      fundName,
      totalCapital: aggregates.totalCapital,
      totalCertificates: aggregates.totalCertificates,
      capitalInMonth: aggregates.capitalInMonth,
      certificatesInMonth: aggregates.certificatesInMonth,
      latestFundPrice,
    });

    console.log('✅ Monthly report generation completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Monthly report generation failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

void run();
