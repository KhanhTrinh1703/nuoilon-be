import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns/format';
import { isValid } from 'date-fns/isValid';
import { parse } from 'date-fns/parse';
import { Repository } from 'typeorm';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { UpsertExcelTransactionDto } from './dto/upsert-excel-transaction.dto';
import { FundPrice } from '../database/entities/fund-price.entity';

@Injectable()
export class AppscriptsService {
  private static readonly DEFAULT_FUND_NAME = 'E1VFVN30';

  constructor(
    private readonly excelTransactionRepository: ExcelTransactionRepository,
    @InjectRepository(FundPrice)
    private readonly fundPriceRepository: Repository<FundPrice>,
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

    const transaction =
      await this.excelTransactionRepository.upsertTransaction(data);

    const [totalCapital, totalCertificates] = await Promise.all([
      this.excelTransactionRepository.getTotalCapital(),
      this.excelTransactionRepository.getTotalCertificates(),
    ]);

    const averageCost =
      totalCertificates > 0 ? totalCapital / totalCertificates : 0;

    const fundPrice =
      (await this.fundPriceRepository.findOne({
        where: { name: AppscriptsService.DEFAULT_FUND_NAME },
      })) ??
      this.fundPriceRepository.create({
        name: AppscriptsService.DEFAULT_FUND_NAME,
        price: 0,
      });

    fundPrice.averageCost = averageCost;

    await this.fundPriceRepository.save(fundPrice);

    return transaction;
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
