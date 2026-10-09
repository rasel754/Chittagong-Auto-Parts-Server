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
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (env.CLIENT_ORIGIN === '*') return callback(null, true);
        
        const list = env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
        if (
          list.includes(origin) ||
          list.includes('*') ||
          origin.includes('vercel.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

  // 6. Root & Health Check Endpoints
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Chittagong Auto Parts Inventory Server',
      timestamp: new Date().toISOString(),
      timezone: env.APP_TIMEZONE,
      endpoints: {
        health: '/health',
        docs: '/api/docs',
        apiV1: '/api/v1'
      }
    });
  });

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
