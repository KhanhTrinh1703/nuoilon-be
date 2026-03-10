import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TestPublishAppscriptDto {
  @ApiProperty({
    description: 'Transaction type',
    enum: ['deposit', 'certificate'],
    example: 'deposit',
  })
  @IsIn(['deposit', 'certificate'])
  transactionType: 'deposit' | 'certificate';

  @ApiProperty({
    description: 'Transaction date (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsNotEmpty()
  @IsString()
  transactionDate: string;

  @ApiProperty({
    description: '[deposit] Capital amount deposited',
    example: 5000000,
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  capital?: number;

  @ApiProperty({
    description: '[certificate] Number of fund certificates purchased',
    example: 100,
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  numberOfCertificates?: number;

  @ApiProperty({
    description: '[certificate] Price per certificate',
    example: 12500,
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @ApiProperty({
    description: 'Unique transaction identifier',
    example: 'ocr_test-uuid',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;
}
