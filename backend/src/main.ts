// Only For module alias
import * as moduleAlias from 'module-alias';
import 'module-alias/register';
import * as path from 'path';

moduleAlias.addAliases({
  '@domain': path.resolve(__dirname, 'domain'),
  '@application': path.resolve(__dirname, 'application'),
  '@infrastructure': path.resolve(__dirname, 'infrastructure'),
  '@api': path.resolve(__dirname, 'api'),
  '@constants': path.format({ dir: __dirname, name: 'constants' }),
});

// App modules
import {
  API_BASE_PATH,
  APP_PORT,
  NODE_ENV,
  SWAGGER_SERVER_URLS,
} from '@constants';
import {
  Logger,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerConfiguratorService } from '@infrastructure/swagger/swagger-configurator.service';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix(API_BASE_PATH, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  // Enable versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(cookieParser());

  // Swagger configuration
  if (NODE_ENV !== 'production') {
    SwaggerConfiguratorService.create(
      app,
      SWAGGER_SERVER_URLS,
      API_BASE_PATH,
    ).setup();
  }

  await app.listen(APP_PORT);

  // getUrl() devolve o host do socket ([::1] quando escuta em IPv6), que nao e
  // clicavel em boa parte dos terminais. Loopback e wildcard viram localhost.
  const url = (await app.getUrl()).replace(
    /\/\/(\[::1?\]|0\.0\.0\.0|127\.0\.0\.1)/,
    '//localhost',
  );
  const docsUrl = `${url}/${API_BASE_PATH}/docs`;
  logger.log(`Application is running on: ${url}`);
  logger.log(`Swagger documentation available at: ${docsUrl}`);
}
bootstrap();
