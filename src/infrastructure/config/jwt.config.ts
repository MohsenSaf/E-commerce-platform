import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'secret',
  expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshSecret: process.env.REFRESH_TOKEN_SECRET ?? 'secret',
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  refreshExpiresInDays: parseInt(
    process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? '7',
    10,
  ),
}));
