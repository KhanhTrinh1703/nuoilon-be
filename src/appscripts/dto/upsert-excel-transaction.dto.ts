import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertExcelTransactionDto {
  @ApiPropertyOptional({
    description: 'Transaction date in ISO 8601 format',
    example: '2024-01-22T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @ApiPropertyOptional({
    description: 'Capital amount for the transaction',
    example: 10000000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  capital?: number;

  @ApiPropertyOptional({
    description: 'Number of fund certificates',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  numberOfFundCertificate?: number;

  @ApiProperty({
    description: 'Unique transaction identifier',
    example: 'TXN-2024-001',
  })
  @IsString()
  transactionId: string;
}
