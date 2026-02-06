import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExcelTransaction } from '../../database/entities/excel-transaction.entity';

@Injectable()
export class ExcelTransactionRepository {
  constructor(
    @InjectRepository(ExcelTransaction)
    private repository: Repository<ExcelTransaction>,
  ) {}

  async upsertTransaction(data: {
    transactionDate?: string;
    capital?: number;
    numberOfFundCertificate?: number;
    price?: number;
    transactionId: string;
  }): Promise<ExcelTransaction> {
    const existing = await this.repository.findOne({
      where: { transactionId: data.transactionId },
    });

    if (existing) {
      // Update existing record
      Object.assign(existing, {
        transactionDate: data.transactionDate ?? existing.transactionDate,
        capital: data.capital ?? existing.capital,
        numberOfFundCertificate:
          data.numberOfFundCertificate ?? existing.numberOfFundCertificate,
        price: data.price ?? existing.price,
      });
      return await this.repository.save(existing);
    } else {
      // Insert new record
      const newTransaction = this.repository.create(data);
      return await this.repository.save(newTransaction);
    }
  }
}
