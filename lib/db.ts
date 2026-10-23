import mongoose from 'mongoose';
import { scheduleDatabaseBootstrap } from '@/lib/db-bootstrap';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Serverless-safe pool tuning: each function instance gets its own pool
      // via the global.mongoose cache, so a low ceiling here prevents a burst
      // of concurrent invocations from opening far more sockets than a shared
      // MongoDB cluster (esp. an Atlas M0/M2 tier) allows across all instances.
      maxPoolSize: 10,
      // M0 free tier: keep no idle sockets pinned (minPoolSize 0) and trim
      // connections that sit unused, so warm-but-idle Vercel instances don't
      // hold sockets against the cluster's ~500-connection ceiling.
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // Fail fast instead of hanging the request when the cluster is
      // unreachable - every caller already wraps connectToDatabase() in its
      // own try/catch with a hardcoded fallback, so a quick failure is what
      // lets those fallbacks actually kick in promptly.
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  // First connection of this process: make sure the indexes exist (background, never blocks).
  scheduleDatabaseBootstrap(cached.conn);

  return cached.conn;
}

export default connectToDatabase;
