import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/database/connection.js';
import { bootstrapSystem } from '../src/database/bootstrap.js';

let isBootstrapped = false;
let dbInitPromise: Promise<void> | null = null;
const app = createApp();

async function ensureConnected() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await connectDatabase();
        if (!isBootstrapped) {
          isBootstrapped = true;
          await bootstrapSystem().catch((err) => {
            console.error('System bootstrap warning:', err);
          });
        }
      } catch (error) {
        dbInitPromise = null;
        console.error('Database connection error in serverless handler:', error);
      }
    })();
  }
  return dbInitPromise;
}

export default async function handler(req: any, res: any) {
  await ensureConnected();

  return new Promise<void>((resolve, reject) => {
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
    res.on('error', (err: any) => reject(err));
    app(req, res, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
