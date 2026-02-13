import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OcrErrorCallbackDto {
  @ApiProperty({
    description: 'Human-readable error details from OCR worker',
    example: 'OCR provider timeout while parsing image',
  })
  @IsString()
  @IsNotEmpty()
  errorMessage!: string;

  @ApiPropertyOptional({
    description: 'Optional machine-readable error code',
    example: 'OCR_TIMEOUT',
  })
  @IsOptional()
  @IsString()
  errorCode?: string;
}
