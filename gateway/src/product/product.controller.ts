import {
  Controller,
  Post,
  Body,
  Inject,
  Req,
  Patch,
  Param,
  Delete,
  HttpCode,
  Get,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AddProductDto } from './dto/add.dto';
import { UpdateProductDto } from './dto/update.dto';
import { extractToken } from 'src/utils/extarctToken';

@Controller('product')
export class ProductController {
  constructor(
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  @Post('create')
  async createProduct(
    @Body() addProductDto: AddProductDto,
    @Req() req: Request,
  ) {
    const token = extractToken(req);

    return await firstValueFrom(
      this.productClient.send('create', {
        token,
        addProductDto,
      }),
    );
  }

  @Patch(':id')
  async updateProduct(
    @Body() updateProductDto: UpdateProductDto,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const token = extractToken(req);

    return await firstValueFrom(
      this.productClient.send(`update`, {
        token,
        id,
        updateProductDto,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteProduct(@Param('id') id: string, @Req() req: Request) {
    const token = extractToken(req);

    return await firstValueFrom(
      this.productClient.send(`delete`, {
        token,
        id,
      }),
    );
  }

  @Get('list')
  async getProductList(
    @Query() query: { pageSize: number; page: number; searchText?: string },
    @Req() req: Request,
  ) {
    const token = extractToken(req);
    const { pageSize, page, searchText } = query;
    return await firstValueFrom(
      this.productClient.send('productList', {
        token,
        page: Number(page),
        pageSize: Number(pageSize),
        searchText,
      }),
    );
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return await firstValueFrom(
      this.productClient.send('product', {
        id,
      }),
    );
  }
}
