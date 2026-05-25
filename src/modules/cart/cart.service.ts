import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-Item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { items: { include: { product: true } } },
    });
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    // TODO: check inventory stock

    return this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      },
      update: { quantity: { increment: dto.quantity } },
      include: { product: true },
    });
  }

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        updatedAt: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!cart) return { items: [], total: 0 };
    return cart;
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: userId },
    });

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!cart) throw new NotFoundException('Cart not found');
    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    return await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart item not found');
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared successfully' };
  }
}
