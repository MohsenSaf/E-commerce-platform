import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma } from 'generated/prisma/client';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isEmailVerified: true,
        // no password
      },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true }, // 👈 only fetch id, no need for full user
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    try {
      const user = await this.prisma.user.create({ data: dto });
      return new UserEntity(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already in use');
        }
      }
      throw error;
    }
  }

  async updatePassword(userId: string, newPassword: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newPassword },
    });
  }

  async markEmailVerified(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  }
}
