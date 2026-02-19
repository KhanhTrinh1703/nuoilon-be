import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class PublishOcrJobDto {
  @ApiProperty({ type: 'string', example: 'job_123', required: true })
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty({ type: 'string', example: 'idem_abc_456', required: true })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ type: 'number', example: 123456789, required: true })
  @IsInt()
  @IsNotEmpty()
  chatId: number;

  @ApiProperty({ type: 'number', example: 987654321, required: true })
  @IsInt()
  @IsNotEmpty()
  userId: number;
}
