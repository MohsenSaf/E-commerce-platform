import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import mailConfig from '../config/mail.config';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
