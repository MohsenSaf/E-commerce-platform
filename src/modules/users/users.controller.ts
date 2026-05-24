import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  Post,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AddressService } from '../address/address.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from '../address/dto/create-address.dto';
import { UpdateAddressDto } from '../address/dto/update-address.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly addressService: AddressService,
  ) {}

  // ─── Profile ───────────────────────────────────────────────────
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ─── Addresses ─────────────────────────────────────────────────
  @Post('address')
  addAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.addAddress(user.id, dto);
  }

  @Get('addresses')
  getAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.addressService.findAddressesByUserId(user.id);
  }

  @Patch('address/:addressId')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(user.id, addressId, dto);
  }

  @Delete('address/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
  ) {
    await this.addressService.deleteAddress(user.id, addressId);
  }

  @Patch('address/:addressId/default')
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
  ) {
    return this.addressService.setDefaultAddress(user.id, addressId);
  }
}
