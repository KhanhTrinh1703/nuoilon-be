import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertExcelTransactionDto {
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  capital?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  numberOfFundCertificate?: number;

  @IsString()
  transactionId: string;
}
