import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpsertCertificateTransactionDto {
  @ApiProperty({
    description: 'Transaction date in ISO format',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  transactionDate: string;

  @ApiProperty({
    description: 'Number of fund certificates purchased',
    example: 1234.5678,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  numberOfCertificates: number;

  @ApiProperty({
    description: 'Price per certificate',
    example: 12500.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'Unique transaction identifier',
    example: 'CERT-2024-001',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;
}
