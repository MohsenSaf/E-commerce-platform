import { Controller, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { RpcJwtAuthGuard } from '@/common/guards/jwtAuth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(RpcJwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @MessagePattern('create')
  async createProduct(@Payload() payload: any) {
    const { addProductDto } = payload;
    return await this.productService.createProduct(addProductDto);
  }

  @UseGuards(RpcJwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @MessagePattern('update')
  async updateProduct(@Payload() payload: any) {
    const { updateProductDto, id } = payload;
    return await this.productService.updateProduct(id, updateProductDto);
  }

  @UseGuards(RpcJwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @MessagePattern('delete')
  async deleteProduct(@Payload() payload: any) {
    const { id } = payload;
    return await this.productService.deleteProduct(id);
  }

  @MessagePattern('product')
  async getProduct(@Payload() payload: any) {
    const { id } = payload;
    return await this.productService.getProduct(id);
  }

  @MessagePattern('productList')
  async getProductList(@Payload() payload: any) {
    const { page, pageSize, searchText } = payload;

    return await this.productService.getProductList(page, pageSize, searchText);
  }
}
