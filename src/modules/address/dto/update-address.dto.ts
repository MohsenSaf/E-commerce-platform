import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName?: string;

  @ApiProperty({ example: '123-456-7890' })
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  street?: string;

  @ApiProperty({ example: 'Anytown' })
  @IsString()
  city?: string;

  @ApiProperty({ example: 'State' })
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Country' })
  @IsString()
  country?: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
