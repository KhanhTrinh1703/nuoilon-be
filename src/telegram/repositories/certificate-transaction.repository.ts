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

  async upsertTransaction(data: {
    transactionDate: string;
    numberOfCertificates: number;
    price: number;
    transactionId: string;
  }): Promise<CertificateTransaction> {
    const existing = await this.repository.findOne({
      where: { transactionId: data.transactionId },
    });

    if (existing) {
      Object.assign(existing, {
        transactionDate: new Date(data.transactionDate),
        numberOfCertificates: data.numberOfCertificates,
        price: data.price,
      });
      return await this.repository.save(existing);
    }

    const transaction = this.repository.create({
      transactionDate: new Date(data.transactionDate),
      numberOfCertificates: data.numberOfCertificates,
      price: data.price,
      transactionId: data.transactionId,
    });

    return await this.repository.save(transaction);
  }
}
