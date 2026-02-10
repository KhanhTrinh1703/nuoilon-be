import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppscriptsController } from './appscripts.controller';
import { AppscriptsService } from './appscripts.service';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { ExcelTransaction } from '../database/entities/excel-transaction.entity';
import { FundPrice } from '../database/entities/fund-price.entity';
import { DepositTransaction } from '../database/entities/deposit-transaction.entity';
import { CertificateTransaction } from '../database/entities/certificate-transaction.entity';
import { DepositTransactionRepository } from './repositories/deposit-transaction.repository';
import { CertificateTransactionRepository } from './repositories/certificate-transaction.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExcelTransaction,
      FundPrice,
      DepositTransaction,
      CertificateTransaction,
    ]),
  ],
  controllers: [AppscriptsController],
  providers: [
    AppscriptsService,
    ExcelTransactionRepository,
    DepositTransactionRepository,
    CertificateTransactionRepository,
  ],
})
export class AppscriptsModule {}
