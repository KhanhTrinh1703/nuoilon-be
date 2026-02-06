import { Injectable } from '@nestjs/common';
import { format } from 'date-fns/format';
import { isValid } from 'date-fns/isValid';
import { parse } from 'date-fns/parse';
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
      price: dto.price,
      transactionId: dto.transactionId,
    };

    return await this.excelTransactionRepository.upsertTransaction(data);
  }

  private parseDateString(
    dateStr: string,
    formatStr: string = 'dd/MM/yyyy',
  ): string {
    // Parse input date string using provided format
    const parsedDate = parse(dateStr, formatStr, new Date());

    // Return as ISO date string (YYYY-MM-DD) suitable for database insertion
    if (!isValid(parsedDate)) {
      throw new Error(
        `Invalid date string: ${dateStr} with format: ${formatStr}`,
      );
    }
    return format(parsedDate, 'yyyy-MM-dd');
  }
}
