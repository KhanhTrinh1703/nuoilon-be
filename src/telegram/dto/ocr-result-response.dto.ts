import { ApiProperty } from '@nestjs/swagger';
import { OcrJobStatus } from '../../database/entities/ocr-job.entity';

export class OcrResultResponseDto {
  @ApiProperty({
    description: 'Operation status',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'OCR job id',
    example: 'fcbf8f0b-2010-4e0a-9b06-53f786f51439',
  })
  jobId!: string;

  @ApiProperty({
    description: 'Current OCR job status after callback processing',
    enum: OcrJobStatus,
    example: OcrJobStatus.NEED_CONFIRM,
  })
  status!: OcrJobStatus;

  @ApiProperty({
    description:
      'Telegram message id that contains formatted OCR result + inline confirmation buttons',
    example: '4812',
  })
  tgSentMessageId!: string;
}
