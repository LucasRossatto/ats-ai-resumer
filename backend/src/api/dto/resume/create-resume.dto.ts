import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResumeDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'PDF file, at most 5MB',
  })
  file: any;

  @ApiPropertyOptional({
    description: 'Resume title. Defaults to the file name when omitted.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
