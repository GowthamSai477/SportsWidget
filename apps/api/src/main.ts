import { join } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { VersioningType } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Behind proxies (nginx/cloudfront later) we want real client IPs for throttling.
    rawBody: false,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>("port") ?? 3000;

  if (config.get<string>("env") === "production" && !config.get<string>("jwt.secret")) {
    throw new Error("JWT_SECRET must be set outside development");
  }

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api", { exclude: ["health"] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Widgets API")
    .setDescription("Universal sports schedule platform — schedules, live state, standings, widgets")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port);
  console.log(`[api] listening on :${port}  (docs: /api/docs, health: /health)`);
}

void bootstrap();
