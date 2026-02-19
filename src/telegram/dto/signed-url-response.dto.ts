import { ApiProperty } from '@nestjs/swagger';

export class SignedUrlResponseDto {
  @ApiProperty({
    description: 'Signed URL for downloading the image from Supabase Storage',
    example:
      'https://example.supabase.co/storage/v1/object/sign/telegram-uploads/images/1700000000000_test.jpg?token=...',
  })
  signedUrl!: string;

  @ApiProperty({
    description: 'Signed URL expiry timestamp in unix milliseconds',
    example: 1767225600000,
  })
  expiresAt!: number;
}
