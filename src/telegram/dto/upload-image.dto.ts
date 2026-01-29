import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to upload',
    required: true,
  })
  file!: any;

  @ApiProperty({
    description: 'User ID for tracking (optional, defaults to "test-user")',
    example: 'test-user-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Optional description for the upload',
    example: 'Test image upload from Postman',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
