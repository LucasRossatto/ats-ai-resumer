import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAuthDto {
  @ApiProperty({ description: "User's first name", example: 'John' })
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Optional on purpose: signing up asks for the least it can, and the profile
   * page fills the rest in later. A resume analyzer has no use for a surname or
   * an age at the door, and requiring them only cost registrations.
   */
  @ApiPropertyOptional({ description: "User's last name", example: 'Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastname?: string;

  @ApiPropertyOptional({ description: "User's age", example: 30 })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiProperty({
    description: "User's email address",
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The password for the user',
    minLength: 8,
    example: 'mySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
