import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Men Shoes' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'All kinds of men shoes' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
