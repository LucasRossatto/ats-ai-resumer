import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123' })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'NewPassword456' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  newPassword: string;
}
