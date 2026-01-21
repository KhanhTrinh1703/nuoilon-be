import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppscriptsController } from './appscripts.controller';
import { AppscriptsService } from './appscripts.service';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { ExcelTransaction } from '../database/entities/excel-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExcelTransaction])],
  controllers: [AppscriptsController],
  providers: [AppscriptsService, ExcelTransactionRepository],
})
export class AppscriptsModule {}
