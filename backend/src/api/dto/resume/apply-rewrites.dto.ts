import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ApplyRewritesDto {
  @ApiProperty({
    description:
      'Analysis whose bullet rewrites are applied. Without rewriteIndexes, all of them.',
  })
  @IsString()
  @IsNotEmpty()
  analysisId: string;

  @ApiPropertyOptional({
    description:
      'Positions (from 0) of the rewrites to apply. Omit to apply all of them.',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  rewriteIndexes?: number[];
}
