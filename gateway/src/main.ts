import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './common/rpc-to-http.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
