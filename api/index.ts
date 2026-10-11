import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/database/connection.js';
import { bootstrapSystem } from '../src/database/bootstrap.js';

let isBootstrapped = false;
const app = createApp();

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await connectDatabase();
  if (!isBootstrapped) {
    isBootstrapped = true;
    bootstrapSystem().catch((err) => {
      console.error('System bootstrap warning:', err);
    });
  }
}

export default async function handler(req: any, res: any) {
  try {
    await ensureConnected();
  } catch (error: any) {
    console.error('Database connection error in serverless handler:', error);
    const origin = req.headers?.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return res.status(503).json({
      success: false,
      message: 'সার্ভারের ডাটাবেজের সাথে সংযোগ স্থাপন করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      error: error?.message || 'Database connection error'
    });
  }

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
