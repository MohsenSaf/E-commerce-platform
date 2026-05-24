import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'username',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'username@example.com' })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
