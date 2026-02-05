import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertExcelTransactionDto {
  @ApiPropertyOptional({
    description: 'Transaction date string (date only, no time/timezone)',
    example: '22/01/2024',
  })
  @IsOptional()
  @IsString()
  transactionDate?: string;

  @ApiPropertyOptional({
    description:
      'Date format using date-fns format tokens (e.g., dd/MM/yyyy, yyyy/MM/dd, dd-MM-yyyy)',
    example: 'dd/MM/yyyy',
    default: 'dd/MM/yyyy',
  })
  @IsOptional()
  @IsString()
  dateFormat?: string = 'dd/MM/yyyy';

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

  @ApiPropertyOptional({
    description: 'Unit price per fund certificate',
    example: 15.25,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @ApiProperty({
    description: 'Unique transaction identifier',
    example: 'TXN-2024-001',
  })
  @IsString()
  transactionId: string;
}
