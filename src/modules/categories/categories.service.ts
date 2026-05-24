import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';
import { generateSlug } from '../../shared/utils/slug.util';
import { Prisma } from 'generated/prisma/browser';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────
  async create(dto: CreateCategoryDto) {
    const slug = generateSlug(dto.name);

    // check name and slug uniqueness
    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ name: dto.name }, { slug }],
      },
    });

    if (existing) {
      throw new ConflictException('Category name already exists');
    }

    return this.prisma.category.create({
      data: { ...dto, slug },
    });
  }

  // ─── Find All (public) ─────────────────────────────────────────
  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          isActive: true,
          // _count: { select: { products: true } }, // 👈 product count
        },
      }),
      this.prisma.category.count({ where }),
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        isActive: true,
        // _count: { select: { products: true } },
      },
    });

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // ─── Find by Slug (public) ─────────────────────────────────────
  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // ─── Update (admin) ────────────────────────────────────────────
  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id); // verify exists

    // if name changed — regenerate slug
    const slug = dto.name ? generateSlug(dto.name) : undefined;

    // check new name/slug not taken by another category
    if (dto.name || slug) {
      const conflict = await this.prisma.category.findFirst({
        where: {
          OR: [
            ...(dto.name ? [{ name: dto.name }] : []),
            ...(slug ? [{ slug }] : []),
          ],
          NOT: { id }, // exclude current category
        },
      });

      if (conflict) {
        throw new ConflictException('Category name already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: { ...dto, ...(slug && { slug }) },
    });
  }

  // ─── Delete (admin) ────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id); // verify exists

    // check if category has products
    // const productCount = await this.prisma.product.count({
    //   where: { categoryId: id },
    // });

    // if (productCount > 0) {
    //   throw new ConflictException(
    //     `Cannot delete category with ${productCount} products. Remove products first.`,
    //   );
    // }

    await this.prisma.category.delete({ where: { id } });
  }

  // ─── Admin: Find All including inactive ────────────────────────
  async findAllAdmin(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        // include: { _count: { select: { products: true } } },
      }),
      this.prisma.category.count({ where }),
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
}
