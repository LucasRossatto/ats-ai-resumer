import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyRewritesDto {
  @ApiProperty({
    description:
      'Analysis whose bullet rewrites are applied. All of them are applied at once.',
  })
  @IsString()
  @IsNotEmpty()
  analysisId: string;
}
