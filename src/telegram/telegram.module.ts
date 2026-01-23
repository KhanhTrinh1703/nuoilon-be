import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { ExcelTransaction } from '../database/entities/excel-transaction.entity';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcelTransaction]),
    ConfigModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService, ExcelTransactionRepository],
})
export class TelegramModule {}

