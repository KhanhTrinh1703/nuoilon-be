import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import { GenerateReportRequestDto } from './dto/generate-report-request.dto';
import { MonthlyReportResponseDto } from './dto/monthly-report-response.dto';
import { DisableInProductionGuard } from '../common/guards/disable-in-production.guard';

@ApiTags('report')
@Controller({ path: 'report', version: '1' })
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('monthly')
  @UseGuards(DisableInProductionGuard)
  @ApiOperation({
    summary: 'Manually trigger monthly investment report generation',
    description:
      'Available only in non-production environments. Aggregates excel transactions and fund prices for the provided month and fund name.',
  })
  @ApiOkResponse({
    description:
      'Monthly investment report generated or refreshed successfully.',
    type: MonthlyReportResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input payload.' })
  @ApiNotFoundResponse({ description: 'Fund price could not be resolved.' })
  async generateReport(
    @Body() body: GenerateReportRequestDto,
  ): Promise<MonthlyReportResponseDto> {
    return this.reportService.generateMonthlyReport(body.month, body.fundName);
  }

  @Get(':month/:fundName')
  @ApiOperation({ summary: 'Fetch an existing monthly investment report' })
  @ApiOkResponse({
    description: 'Monthly investment report found.',
    type: MonthlyReportResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Monthly report has not been generated yet.',
  })
  async getReport(
    @Param('month') month: string,
    @Param('fundName') fundName: string,
  ): Promise<MonthlyReportResponseDto> {
    return this.reportService.getMonthlyReport(month, fundName);
  }
}
