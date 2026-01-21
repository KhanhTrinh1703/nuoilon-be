import { Injectable } from '@nestjs/common';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { UpsertExcelTransactionDto } from './dto/upsert-excel-transaction.dto';

@Injectable()
export class AppscriptsService {
  constructor(
    private readonly excelTransactionRepository: ExcelTransactionRepository,
  ) {}

  async upsertExcelTransaction(dto: UpsertExcelTransactionDto) {
    const data = {
      transactionDate: dto.transactionDate
        ? new Date(dto.transactionDate)
        : undefined,
      capital: dto.capital,
      numberOfFundCertificate: dto.numberOfFundCertificate,
      transactionId: dto.transactionId,
    };

    return await this.excelTransactionRepository.upsertTransaction(data);
  }
}
