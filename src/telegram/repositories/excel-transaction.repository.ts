import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExcelTransaction } from '../../database/entities/excel-transaction.entity';

@Injectable()
export class ExcelTransactionRepository {
  constructor(
    @InjectRepository(ExcelTransaction)
    private readonly repository: Repository<ExcelTransaction>,
  ) {}

  async getTotalCapital(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.capital)', 'total')
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getTransactionCount(): Promise<number> {
    return this.repository.count();
  }
}
