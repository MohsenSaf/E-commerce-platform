import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/browser';
import { OrderStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
        },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    let total = 0;

    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException(
          `Product ${item.product.name} is no longer available`,
        );
      }

      const itemInventory = item.product.inventory;

      if (!itemInventory) {
        throw new NotFoundException(
          `Inventory for ${item.product.name} not found`,
        );
      }

      const availableStock = itemInventory.stock - itemInventory.reservedStock;

      if (item.quantity > availableStock) {
        throw new BadRequestException(
          `Not enough stock for ${item.product.name}. Available: ${availableStock}`,
        );
      }

      total =
        Math.round((total + Number(item.product.price) * item.quantity) * 100) /
        100;
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // step 1 — create order
      const order = await tx.order.create({
        data: {
          userId,
          total,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price, //  snapshot price
            })),
          },
        },
        include: { items: true },
      });

      // step 2 — reserve stock for each item
      for (const item of cart.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedStock: { increment: item.quantity }, // reserve, don't deduct yet
          },
        });
      }

      // step 3 — clear the cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });

    return order;
  }

  async getOrders(userId: string, query: OrderQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, imageUrl: true, slug: true },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true, slug: true },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    // use transaction — status update + stock release must be atomic
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true }, // return full order
      });

      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }

      return updated; // return it
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // ─── Validate transition ───────────────────────────────────────
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    };

    const allowed = validTransitions[order.status] ?? [];

    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${status}`,
      );
    }

    // ─── Simple status update (no stock changes needed) ────────────
    if (status !== OrderStatus.DELIVERED && status !== OrderStatus.CANCELLED) {
      return this.prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });
    }

    // ─── Transaction needed (stock changes required) ───────────────
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });

      for (const item of order.items) {
        if (status === OrderStatus.DELIVERED) {
          // physically remove from warehouse + release reservation
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              stock: { decrement: item.quantity }, // actual stock reduction
              reservedStock: { decrement: item.quantity }, // release reservation
            },
          });
        }

        if (status === OrderStatus.CANCELLED) {
          // just release reservation — nothing left warehouse
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              reservedStock: { decrement: item.quantity },
            },
          });
        }
      }

      return updated;
    });
  }
}
