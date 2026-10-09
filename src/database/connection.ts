import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../common/logger.js';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

let memoryServer: any = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(env.MONGODB_URI, opts).then((m) => {
      logger.info(`MongoDB connected successfully to host: ${m.connection.host}`);
      return m;
    }).catch(async (error: any) => {
      cached.promise = null;
      logger.warn({ error: error.message }, 'Standard MongoDB connection failed. Checking fallback...');
      
      if (env.NODE_ENV !== 'production' && !process.env.VERCEL) {
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
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
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
