import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from 'generated/prisma/enums';

export class OrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
