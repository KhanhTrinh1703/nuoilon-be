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

  async getTotalCertificates(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('cert')
      .select('COALESCE(SUM(cert.numberOfCertificates), 0)', 'total')
      .getRawOne<{ total: string | number | null }>();

    return Number(result?.total ?? 0);
  }
}
