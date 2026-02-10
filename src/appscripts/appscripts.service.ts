import { BadRequestException, Injectable } from '@nestjs/common';
import { format } from 'date-fns/format';
import { isValid } from 'date-fns/isValid';
import { parse } from 'date-fns/parse';
import { DepositTransactionRepository } from './repositories/deposit-transaction.repository';
import { CertificateTransactionRepository } from './repositories/certificate-transaction.repository';
import { UpsertExcelTransactionDto } from './dto/upsert-excel-transaction.dto';
import { UpsertDepositTransactionDto } from './dto/upsert-deposit-transaction.dto';
import { UpsertCertificateTransactionDto } from './dto/upsert-certificate-transaction.dto';

@Injectable()
export class AppscriptsService {
  constructor(
    private readonly depositTransactionRepository: DepositTransactionRepository,
    private readonly certificateTransactionRepository: CertificateTransactionRepository,
  ) {}

  async upsertDepositTransaction(dto: UpsertDepositTransactionDto) {
    return await this.depositTransactionRepository.upsertTransaction({
      transactionDate: dto.transactionDate,
      capital: dto.capital,
      transactionId: dto.transactionId,
    });
  }

  async upsertCertificateTransaction(dto: UpsertCertificateTransactionDto) {
    return await this.certificateTransactionRepository.upsertTransaction({
      transactionDate: dto.transactionDate,
      numberOfCertificates: dto.numberOfCertificates,
      price: dto.price,
      transactionId: dto.transactionId,
    });
  }

  /**
   * @deprecated Use upsertDepositTransaction or upsertCertificateTransaction instead.
   * This method will be removed after Google AppScript migration.
   */
  async upsertExcelTransaction(dto: UpsertExcelTransactionDto) {
    if (!dto.transactionDate) {
      throw new BadRequestException('Transaction date is required.');
    }

    const transactionDate = this.parseDateString(
      dto.transactionDate,
      dto.dateFormat,
    );
    const hasCapital = dto.capital !== null && dto.capital !== undefined;
    const hasCertificates =
      dto.numberOfFundCertificate !== null &&
      dto.numberOfFundCertificate !== undefined;
    const hasPrice = dto.price !== null && dto.price !== undefined;

    if (hasCapital && !hasCertificates && !hasPrice) {
      return await this.depositTransactionRepository.upsertTransaction({
        transactionDate,
        capital: dto.capital!,
        transactionId: dto.transactionId,
      });
    }

    if (!hasCapital && hasCertificates && hasPrice) {
      return await this.certificateTransactionRepository.upsertTransaction({
        transactionDate,
        numberOfCertificates: dto.numberOfFundCertificate!,
        price: dto.price!,
        transactionId: dto.transactionId,
      });
    }

    if (hasCapital && hasCertificates && hasPrice) {
      throw new BadRequestException(
        'Transaction contains both deposit and certificate data. ' +
          'Please use separate endpoints: /deposit-transaction or /certificate-transaction',
      );
    }

    throw new BadRequestException(
      'Transaction must contain either deposit data (capital) or certificate data (numberOfFundCertificate + price)',
    );
  }

  private parseDateString(
    dateStr: string,
    formatStr: string = 'dd/MM/yyyy',
  ): string {
    // Parse input date string using provided format
    const parsedDate = parse(dateStr, formatStr, new Date());

    // Return as ISO date string (YYYY-MM-DD) suitable for database insertion
    if (!isValid(parsedDate)) {
      throw new BadRequestException(
        `Invalid date string: ${dateStr} with format: ${formatStr}`,
      );
    }
    return format(parsedDate, 'yyyy-MM-dd');
  }
}
