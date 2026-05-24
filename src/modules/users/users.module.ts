import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AddressService } from '../address/address.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AddressService],
  exports: [UsersService],
})
export class UsersModule {}
