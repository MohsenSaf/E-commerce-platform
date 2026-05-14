import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email: string;
  name: string;

  @Exclude() // 👈 this field is always stripped from responses
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
