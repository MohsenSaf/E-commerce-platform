import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  token: process.env.MAIL_TOKEN!,
  from: {
    address: process.env.MAIL_FROM!,
    name: process.env.MAIL_FROM_NAME!,
  },
  appUrl: process.env.APP_URL!,
}));
