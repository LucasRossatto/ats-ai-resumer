import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DiffVersionsDto {
  @ApiProperty({ description: 'Version the comparison starts from.' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ description: 'Version the comparison ends at.' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({
    description: 'Granularity of the comparison. Defaults to words.',
    enum: ['words', 'lines'],
  })
  @IsOptional()
  @IsIn(['words', 'lines'])
  mode?: 'words' | 'lines';
}
