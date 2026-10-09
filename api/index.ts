import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/database/connection.js';
import { bootstrapSystem } from '../src/database/bootstrap.js';

let isBootstrapped = false;
const app = createApp();

export default async function handler(req: any, res: any) {
  try {
    await connectDatabase();
    if (!isBootstrapped) {
      await bootstrapSystem().catch((err) => {
        console.error('System bootstrap warning:', err);
      });
      isBootstrapped = true;
    }
  } catch (error) {
    console.error('Database connection error in serverless handler:', error);
  }

  return app(req, res);
}
