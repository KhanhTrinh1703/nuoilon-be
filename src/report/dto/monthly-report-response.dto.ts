import { ApiProperty } from '@nestjs/swagger';

export class MonthlyReportResponseDto {
  @ApiProperty({ example: '2024-01' })
  reportMonth: string;

  @ApiProperty({ example: 'E1VFVN30' })
  fundName: string;

  /** Cumulative capital from inception to the report month. */
  @ApiProperty({ example: 25000000 })
  totalCapital: number;

  /** Cumulative certificates from inception to the report month. */
  @ApiProperty({ example: 2187.72 })
  totalCertificates: number;

  /** Capital transacted within the report month only. */
  @ApiProperty({ example: 5000000 })
  capitalInMonth: number;

  /** Certificates transacted within the report month only. */
  @ApiProperty({ example: 420.88 })
  certificatesInMonth: number;

  @ApiProperty({ example: 24.56 })
  latestFundPrice: number;

  @ApiProperty({ example: '2024-01-31T15:00:00.000Z' })
  updatedAt: string;
}
