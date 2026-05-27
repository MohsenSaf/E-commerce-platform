import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderQueryDto } from './dto/order-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user orders' })
  findUserOrder(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.getOrders(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create new order' })
  createOrder(@CurrentUser() user: AuthenticatedUser) {
    return this.orderService.createOrder(user.id);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get order by id' })
  findOrderById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') orderId: string,
  ) {
    return this.orderService.getOrder(user.id, orderId);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Cancel order by id' })
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') orderId: string,
  ) {
    return this.orderService.cancelOrder(user.id, orderId);
  }

  @Patch('/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status (admin)' })
  updateOrderStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(orderId, dto.status);
  }
}
