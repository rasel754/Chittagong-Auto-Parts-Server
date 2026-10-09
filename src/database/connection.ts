import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../common/logger.js';

let memoryServer: any = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 3000
    });
    logger.info(`MongoDB connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Standard MongoDB connection failed. Checking fallback...');
    
    if (env.NODE_ENV !== 'production') {
      try {
        logger.info('Starting embedded MongoDB Memory Server for local development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'chittagong_auto_parts'
          }
        });
        const uri = memoryServer.getUri();
        const conn = await mongoose.connect(uri, { autoIndex: true });
        logger.info(`Embedded MongoDB Memory Server connected successfully at: ${uri}`);
        return conn;
      } catch (memError) {
        logger.error({ error: memError }, 'Failed to start MongoMemoryServer fallback');
        throw error;
      }
    }
    
    logger.error({ error }, 'MongoDB connection failed');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting MongoDB');
  }
}
