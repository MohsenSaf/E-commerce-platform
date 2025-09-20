import { Body, Controller, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { RpcJwtAuthGuard } from './common/guards/jwtAuth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(RpcJwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @MessagePattern('create')
  async createProduct(@Payload() payload: any) {
    const { addProductDto } = payload;
    return await this.appService.createProduct(addProductDto);
  }

  @UseGuards(RpcJwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @MessagePattern('update')
  async updateProduct(@Payload() payload: any) {
    const { updateProductDto, id } = payload;
    return await this.appService.updateProduct(id, updateProductDto);
  }

  @UseGuards(RpcJwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @MessagePattern('delete')
  async deleteProduct(@Payload() payload: any) {
    const { id } = payload;
    return await this.appService.deleteProduct(id);
  }

  @MessagePattern('product')
  async getProduct(@Payload() payload: any) {
    const { id } = payload;
    return await this.appService.getProduct(id);
  }

  @MessagePattern('productList')
  async getProductList(@Payload() payload: any) {
    const { page, pageSize, searchText } = payload;

    return await this.appService.getProductList(page, pageSize, searchText);
  }
}
