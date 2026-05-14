import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { RegisterDto } from 'src/shared/dto/register.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: RegisterDto) {
    const user = await this.prisma.user.create({ data: dto });
    return new UserEntity(user);
  }
}
