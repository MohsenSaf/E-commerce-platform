import { Exclude } from 'class-transformer';
import { Role } from 'generated/prisma/enums';

export class UserEntity {
  id: string;
  username: string;
  email: string;
  createAt: Date;
  updatedAt: Date;
  role: Role;

  @Exclude() // 👈 this field is always stripped from responses
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
