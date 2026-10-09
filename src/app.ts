import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './common/logger.js';
import { apiRouter } from './routes/index.js';
import { swaggerDocument } from './docs/swagger.js';
import { generalRateLimiter } from './middleware/rate-limiter.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';

export function createApp(): Express {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false // Allows Swagger UI inline assets
    })
  );

  // 2. CORS configuration
  const allowedOrigins =
    env.CLIENT_ORIGIN === '*'
      ? '*'
      : env.CLIENT_ORIGIN.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // 3. Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Structured HTTP Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(
      (pinoHttp as unknown as (opts: { logger: typeof logger }) => express.RequestHandler)({
        logger
      })
    );
  }

  // 5. Rate Limiter
  app.use(generalRateLimiter);

  // 6. Health Check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Chittagong Auto Parts Inventory Server',
      timestamp: new Date().toISOString(),
      timezone: env.APP_TIMEZONE
    });
  });

  // 7. Interactive API Documentation (Swagger)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // 8. Main API v1 Routing
  app.use('/api/v1', apiRouter);

  // 9. Centralized 404 handler
  app.use(notFoundHandler);

  // 10. Centralized Error handling
  app.use(errorHandler);

  return app;
}
