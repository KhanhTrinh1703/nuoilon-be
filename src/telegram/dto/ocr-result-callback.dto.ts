import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class OcrResultCallbackDto {
  @ApiProperty({
    description:
      'Parsed OCR result JSON returned by OCR worker. This is stored as-is for confirmation and later transaction insertion.',
    example: {
      transactionType: 'deposit',
      amount: 1000000,
      transactionDate: '2026-01-15',
      note: 'Nap tien tu OCR',
    },
  })
  @IsObject()
  @IsNotEmpty()
  resultJson!: Record<string, unknown>;

  @ApiProperty({
    description: 'OCR provider name',
    example: 'google-vision',
  })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({
    description: 'OCR model/version used by provider',
    example: 'vision-v1',
  })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiPropertyOptional({
    description: 'Optional non-fatal warnings from OCR pipeline',
    example: ['Low contrast image', 'Date was inferred from context'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings?: string[];
}
