import { Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async addAddress(userId: string, dto: CreateAddressDto) {
    // if this address is default, unset all other defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: { userId, ...dto },
    });
  }

  async updateAddress(
    addressId: string,
    userId: string,
    dto: UpdateAddressDto,
  ) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    // if this address is default, unset all other defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId, userId },
      data: { ...dto },
    });
  }

  async findById(addressId: string, userId: string) {
    return this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
  }

  async findAddressesByUserId(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    return this.prisma.address.delete({
      where: { id: addressId, userId },
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId: userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    // unset all other defaults first
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // set this one as default
    return this.prisma.address.update({
      where: { id: addressId, userId },
      data: { isDefault: true },
    });
  }
}
