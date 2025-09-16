import { IsDecimal, IsNotEmpty, IsString } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsDecimal()
  price: string;
}
