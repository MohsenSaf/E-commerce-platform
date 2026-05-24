// modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { generateSlug } from '../../shared/utils/slug.util';
import { Prisma } from 'generated/prisma/browser';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────
  async create(dto: CreateProductDto) {
    const slug = generateSlug(dto.name);

    // check slug uniqueness
    const existing = await this.prisma.product.findUnique({
      where: { slug },
    });
    if (existing) throw new ConflictException('Product name already exists');

    // verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Category not found');

    return this.prisma.product.create({
      data: { ...dto, slug },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  // ─── Find All (public) ─────────────────────────────────────────
  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(categoryId && { categoryId }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined && { gte: minPrice }),
              ...(maxPrice !== undefined && { lte: maxPrice }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          imageUrl: true,
          isFeatured: true,
          isActive: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
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

  // ─── Find One (public) ─────────────────────────────────────────
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── Find by Slug (public) ─────────────────────────────────────
  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── Update (admin) ────────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    const slug = dto.name ? generateSlug(dto.name) : undefined;

    if (slug) {
      const conflict = await this.prisma.product.findFirst({
        where: { slug, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Product name already exists');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new BadRequestException('Category not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: { ...dto, ...(slug && { slug }) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  // ─── Delete (admin) ────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  // ─── Featured Products (public) ────────────────────────────────
  async findFeatured() {
    return this.prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        imageUrl: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  // ─── Products by Category (public) ────────────────────────────
  async findByCategory(categoryId: string, query: ProductQueryDto) {
    return this.findAll({ ...query, categoryId });
  }
}
