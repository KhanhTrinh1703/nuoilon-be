import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositTransaction } from '../../database/entities/deposit-transaction.entity';

@Injectable()
export class DepositTransactionRepository {
  constructor(
    @InjectRepository(DepositTransaction)
    private readonly repository: Repository<DepositTransaction>,
  ) {}

  async upsertTransaction(data: {
    transactionDate: string;
    capital: number;
    transactionId: string;
  }): Promise<DepositTransaction> {
    const existing = await this.repository.findOne({
      where: { transactionId: data.transactionId },
    });

    if (existing) {
      Object.assign(existing, {
        transactionDate: new Date(data.transactionDate),
        capital: data.capital,
      });
      return await this.repository.save(existing);
    }

    const transaction = this.repository.create({
      transactionDate: new Date(data.transactionDate),
      capital: data.capital,
      transactionId: data.transactionId,
    });

    return await this.repository.save(transaction);
  }

  async getTotalCapital(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('deposit')
      .select('COALESCE(SUM(deposit.capital), 0)', 'total')
      .getRawOne<{ total: string | number | null }>();

    return Number(result?.total ?? 0);
  }
}
