import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpsertDepositTransactionDto {
  @ApiProperty({
    description: 'Transaction date in ISO format',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  transactionDate: string;

  @ApiProperty({
    description: 'Capital amount deposited',
    example: 5000000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  capital: number;

  @ApiProperty({
    description: 'Unique transaction identifier',
    example: 'DEP-2024-001',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;
}
