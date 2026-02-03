import { ApiProperty } from '@nestjs/swagger';

export class MonthlyReportResponseDto {
  @ApiProperty({ example: '2024-01' })
  reportMonth: string;

  @ApiProperty({ example: 'E1VFVN30' })
  fundName: string;

  @ApiProperty({ example: 15000000.5 })
  totalInvestment: number;

  @ApiProperty({ example: 123.4567 })
  totalCertificates: number;

  @ApiProperty({ example: 24.56 })
  latestFundPrice: number;

  @ApiProperty({ example: 3024000 })
  certificatesValue: number;

  @ApiProperty({ example: '2024-01-31T15:00:00.000Z' })
  updatedAt: string;
}
