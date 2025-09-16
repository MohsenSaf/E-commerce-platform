import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CreateProductDto } from './dto/create.dto';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async createProduct(CreateProductDto: CreateProductDto) {}
}
