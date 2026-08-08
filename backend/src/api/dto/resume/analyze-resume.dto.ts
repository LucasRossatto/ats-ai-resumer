import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AnalysisLanguage {
  PT_BR = 'pt-BR',
  EN = 'en',
}

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

  @ApiPropertyOptional({
    description: 'Language for the analysis. Defaults to pt-BR.',
    enum: AnalysisLanguage,
    default: AnalysisLanguage.PT_BR,
  })
  @IsOptional()
  @IsEnum(AnalysisLanguage)
  language?: AnalysisLanguage;
}
