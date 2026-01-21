import { Body, Controller, Post } from '@nestjs/common';
import { AppscriptsService } from './appscripts.service';
import { UpsertExcelTransactionDto } from './dto/upsert-excel-transaction.dto';

@Controller({ path: 'appscripts', version: '1' })
export class AppscriptsController {
  constructor(private readonly appscriptsService: AppscriptsService) {}

  @Post('excel-transaction')
  async upsertExcelTransaction(@Body() dto: UpsertExcelTransactionDto) {
    return await this.appscriptsService.upsertExcelTransaction(dto);
  }
}
