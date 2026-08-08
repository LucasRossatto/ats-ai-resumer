import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body of `PATCH /auth/password`. Only the shape is checked here; the strength
 * of the new password is a business rule and stays in `AuthDomainService`, so
 * the policy is not written down in two places that can drift apart.
 */
export class UpdatePasswordDto {
  @ApiProperty({ example: 'CurrentPassword123' })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword456' })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
