import mongoose, { ClientSession } from 'mongoose';
import { logger } from '../logger.js';

/**
 * Executes a callback within a MongoDB transaction if replica set transactions are supported.
 * Falls back gracefully to direct non-transactional execution if standalone MongoDB is detected.
 */
export async function withTransaction<T>(
  callback: (session?: ClientSession) => Promise<T>
): Promise<T> {
  // Check if Mongoose connection is ready
  if (mongoose.connection.readyState !== 1) {
    return callback(undefined);
  }

  let session: ClientSession | null = null;

  try {
    session = await mongoose.startSession();
  } catch (err: unknown) {
    logger.warn(
      { err },
      'MongoDB deployment does not support sessions/transactions. Proceeding in non-transactional mode.'
    );
    return callback(undefined);
  }

  try {
    let result: T;
    try {
      session.startTransaction();
      result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error: unknown) {
      // Check if error is due to standalone MongoDB not supporting transactions
      const errMsg = error instanceof Error ? error.message : String(error);
      if (
        errMsg.includes('Transaction numbers are only allowed on a replica set member') ||
        errMsg.includes('Transactions are not supported by this deployment') ||
        errMsg.includes('replica set')
      ) {
        logger.warn(
          'Transactions not supported on this MongoDB deployment. Retrying operation without transaction session.'
        );
        return await callback(undefined);
      }

      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
