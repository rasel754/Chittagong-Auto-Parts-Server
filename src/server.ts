import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { bootstrapSystem } from './database/bootstrap.js';
import { logger } from './common/logger.js';

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Bootstrap initial admin & shops
    await bootstrapSystem();

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Chittagong Auto Parts Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📖 API Documentation available at: http://localhost:${env.PORT}/api/docs`);
      logger.info(`🏥 Health Check available at: http://localhost:${env.PORT}/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown if taking too long
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
