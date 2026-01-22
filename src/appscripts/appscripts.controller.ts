import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { AppscriptsService } from './appscripts.service';
import { UpsertExcelTransactionDto } from './dto/upsert-excel-transaction.dto';
import { HmacSignatureGuard } from '../common/guards/hmac-signature.guard';

@ApiTags('appscripts')
@ApiSecurity('HMAC-Signature')
@Controller({ path: 'appscripts', version: '1' })
@UseGuards(HmacSignatureGuard)
export class AppscriptsController {
  constructor(private readonly appscriptsService: AppscriptsService) {}

  @Post('excel-transaction')
  @ApiOperation({
    summary: 'Upsert Excel Transaction',
    description:
      'Create or update an Excel transaction record. Requires HMAC signature authentication via X-Signature header.',
  })
  @ApiBody({ type: UpsertExcelTransactionDto })
  @ApiResponse({
    status: 201,
    description: 'Transaction successfully created or updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or HMAC signature',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid HMAC signature',
  })
  async upsertExcelTransaction(@Body() dto: UpsertExcelTransactionDto) {
    return await this.appscriptsService.upsertExcelTransaction(dto);
  }
}
