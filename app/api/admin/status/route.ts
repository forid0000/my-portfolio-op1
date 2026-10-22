import { NextResponse } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';

export async function GET() {
  await configureCloudinary();
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const status = {
    mongodb: { active: false, message: 'Checking...' },
    cloudinary: { active: false, message: 'Checking...' },
  };

  try {
    // 1. Check MongoDB
    try {
      const db = await connectToDatabase();
      if (db.connection.readyState === 1) {
        // 1 = connected
        // Perform an actual ping to be 100% sure
        const adminDb = db.connection.db?.admin();
        if (adminDb) {
          await adminDb.ping();
          status.mongodb = { active: true, message: 'Connected & Responsive' };
        } else {
          status.mongodb = { active: true, message: 'Connected (No Admin Ping)' };
        }
      } else {
        status.mongodb = { active: false, message: 'Not Connected' };
      }
    } catch (dbErr: any) {
      status.mongodb = { active: false, message: dbErr.message || 'Connection Error' };
    }

    // 2. Check Cloudinary
    try {
      // Use ping to check Cloudinary connection
      const cldPing = await cloudinary.api.ping();
      if (cldPing.status === 'ok') {
        status.cloudinary = { active: true, message: 'Integration Active' };
      } else {
        status.cloudinary = { active: false, message: 'Ping Failed' };
      }
    } catch (cldErr: any) {
      status.cloudinary = { active: false, message: cldErr.message || 'API Error' };
    }

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Status Check Error:', error);
    return NextResponse.json({ error: 'Failed to check system status' }, { status: 500 });
  }
}
