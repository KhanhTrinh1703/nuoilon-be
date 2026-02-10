import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateTransaction } from '../../database/entities/certificate-transaction.entity';

@Injectable()
export class CertificateTransactionRepository {
  constructor(
    @InjectRepository(CertificateTransaction)
    private readonly repository: Repository<CertificateTransaction>,
  ) {}

  async getTotalNumberOfCertificates(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('cert')
      .select('COALESCE(SUM(cert.numberOfCertificates), 0)', 'total')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  async getTransactionCount(): Promise<number> {
    return this.repository.count();
  }

  async getDistinctMonths(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder('cert')
      .select("TO_CHAR(cert.transactionDate, 'YYYY-MM')", 'month')
      .distinct(true)
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string }>();

    return result.map((item) => item.month);
  }

  async hasTransactionsForMonth(month: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('cert')
      .where("TO_CHAR(cert.transactionDate, 'YYYY-MM') = :month", {
        month,
      })
      .getCount();

    return count > 0;
  }
}
