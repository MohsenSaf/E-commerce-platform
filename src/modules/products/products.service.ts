// modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { generateSlug } from '../../shared/utils/slug.util';
import {
  CacheKeys,
  CacheTTL,
} from '../../infrastructure/redis/cache-keys.constant';
import { Prisma } from 'generated/prisma/browser';
import { ProductWithCategory } from './types/product.type';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService, // 👈 inject Redis
  ) {}

  // ─── Create ────────────────────────────────────────────────────
  async create(dto: CreateProductDto) {
    const slug = generateSlug(dto.name);

    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Product name already exists');

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Category not found');

    const product = await this.prisma.product.create({
      data: { ...dto, slug },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    // invalidate product list caches
    await this.invalidateProductCaches();

    return product;
  }

  // ─── Find All ──────────────────────────────────────────────────
  async findAll(query: ProductQueryDto) {
    // build unique cache key from query params
    const cacheKey = `${CacheKeys.PRODUCTS}:${JSON.stringify(query)}`;

    // check cache first
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

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
        take: limit,
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
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = {
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

    // store in cache
    await this.redis.setJson(cacheKey, result, CacheTTL.MEDIUM);

    return result;
  }

  // ─── Find One ──────────────────────────────────────────────────
  async findOne(id: string): Promise<ProductWithCategory> {
    const cacheKey = CacheKeys.PRODUCT(id);

    const cached = await this.redis.getJson<ProductWithCategory>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    await this.redis.setJson(cacheKey, product, CacheTTL.LONG);

    return product;
  }

  // ─── Find by Slug ──────────────────────────────────────────────
  async findBySlug(slug: string) {
    const cacheKey = CacheKeys.PRODUCT_SLUG(slug);

    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    await this.redis.setJson(cacheKey, product, CacheTTL.LONG);

    return product;
  }

  // ─── Featured ──────────────────────────────────────────────────
  async findFeatured() {
    const cacheKey = CacheKeys.PRODUCTS_FEATURED;

    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
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

    await this.redis.setJson(cacheKey, products, CacheTTL.MEDIUM);

    return products;
  }

  // ─── Update ────────────────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    const product: ProductWithCategory = await this.findOne(id);

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

    const updated = await this.prisma.product.update({
      where: { id },
      data: { ...dto, ...(slug && { slug }) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // invalidate this product's cache + lists
    await this.invalidateProductCaches(id, product.slug);

    return updated;
  }

  // ─── Remove ────────────────────────────────────────────────────
  async remove(id: string) {
    const product: ProductWithCategory = await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });

    // invalidate caches
    await this.invalidateProductCaches(id, product.slug);
  }

  // ─── Cache Invalidation Helper ─────────────────────────────────
  private async invalidateProductCaches(
    id?: string,
    slug?: string,
  ): Promise<void> {
    const keysToDelete: Promise<void>[] = [
      this.redis.deleteByPattern(`${CacheKeys.PRODUCTS}:*`), // all list caches
      this.redis.delete(CacheKeys.PRODUCTS_FEATURED),
    ];

    if (id) keysToDelete.push(this.redis.delete(CacheKeys.PRODUCT(id)));
    if (slug)
      keysToDelete.push(this.redis.delete(CacheKeys.PRODUCT_SLUG(slug)));

    await Promise.all(keysToDelete);
  }
}
