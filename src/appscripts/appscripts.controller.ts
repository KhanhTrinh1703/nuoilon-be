import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AppscriptsService } from './appscripts.service';
import { UpsertExcelTransactionDto } from './dto/upsert-excel-transaction.dto';
import { HmacSignatureGuard } from '../common/guards/hmac-signature.guard';

@Controller({ path: 'appscripts', version: '1' })
@UseGuards(HmacSignatureGuard)
export class AppscriptsController {
  constructor(private readonly appscriptsService: AppscriptsService) {}

  @Post('excel-transaction')
  async upsertExcelTransaction(@Body() dto: UpsertExcelTransactionDto) {
    return await this.appscriptsService.upsertExcelTransaction(dto);
  }
}
