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
import { UpsertDepositTransactionDto } from './dto/upsert-deposit-transaction.dto';
import { UpsertCertificateTransactionDto } from './dto/upsert-certificate-transaction.dto';
import { HmacSignatureGuard } from '../common/guards/hmac-signature.guard';

@ApiTags('appscripts')
@ApiSecurity('HMAC-Signature')
@Controller({ path: 'appscripts', version: '1' })
@UseGuards(HmacSignatureGuard)
export class AppscriptsController {
  constructor(private readonly appscriptsService: AppscriptsService) {}

  @Post('deposit-transaction')
  @ApiOperation({
    summary: 'Upsert deposit transaction',
    description: 'Create or update a deposit transaction record.',
  })
  @ApiBody({ type: UpsertDepositTransactionDto })
  @ApiResponse({
    status: 201,
    description: 'Deposit transaction successfully created or updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or HMAC signature',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid HMAC signature',
  })
  async upsertDepositTransaction(@Body() dto: UpsertDepositTransactionDto) {
    return await this.appscriptsService.upsertDepositTransaction(dto);
  }

  @Post('certificate-transaction')
  @ApiOperation({
    summary: 'Upsert certificate purchase transaction',
    description:
      'Create or update a fund certificate purchase transaction record.',
  })
  @ApiBody({ type: UpsertCertificateTransactionDto })
  @ApiResponse({
    status: 201,
    description: 'Certificate transaction successfully created or updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or HMAC signature',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid HMAC signature',
  })
  async upsertCertificateTransaction(
    @Body() dto: UpsertCertificateTransactionDto,
  ) {
    return await this.appscriptsService.upsertCertificateTransaction(dto);
  }

  @Post('excel-transaction')
  @ApiOperation({
    summary: '[DEPRECATED] Upsert Excel Transaction',
    description:
      'DEPRECATED: Use /deposit-transaction or /certificate-transaction instead. ' +
      'This endpoint will be removed after Google AppScript migration is complete. ' +
      'Requires HMAC signature authentication via X-Signature header.',
    deprecated: true,
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
