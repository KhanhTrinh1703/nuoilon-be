import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class GenerateReportRequestDto {
  @ApiProperty({ example: '2024-01' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month: string;

  @ApiProperty({ example: 'E1VFVN30' })
  @IsString()
  fundName: string;
}
