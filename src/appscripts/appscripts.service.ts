import { Injectable } from '@nestjs/common';
import { parse, format } from 'date-fns';
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
        ? this.parseDateString(dto.transactionDate, dto.dateFormat)
        : undefined,
      capital: dto.capital,
      numberOfFundCertificate: dto.numberOfFundCertificate,
      transactionId: dto.transactionId,
    };

    return await this.excelTransactionRepository.upsertTransaction(data);
  }

  private parseDateString(dateStr: string, formatStr: string = 'dd/MM/yyyy'): string {
    // Parse input date string using provided format
    const parsedDate = parse(dateStr, formatStr, new Date());
    // Return as ISO date string (YYYY-MM-DD) suitable for database insertion
    return format(parsedDate, 'yyyy-MM-dd');
  }
}
