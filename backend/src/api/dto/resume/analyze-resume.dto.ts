import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeResumeDto {
  @ApiPropertyOptional({
    description:
      'Role the resume is being targeted at. When omitted, the model infers it from the resume.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetRole?: string;

  @ApiPropertyOptional({
    description:
      'Version to analyze. Defaults to the current version of the resume.',
  })
  @IsOptional()
  @IsString()
  versionId?: string;
}
