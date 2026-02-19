import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetSignedUrlDto {
  @ApiProperty({
    description: 'Idempotency key (Telegram file_unique_id)',
    example: 'AQADBAADbXXXXXXXXXXXGBdhD2l6_XX',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
