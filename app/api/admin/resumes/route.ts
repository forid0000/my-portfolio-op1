import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const resumeUploadSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.literal('application/pdf'),
  base64: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('resumes');
    // Exclude base64 so the list loads instantly
    const docs = await collection
      .find({}, { projection: { base64: 0 } })
      .sort({ uploadedAt: -1 })
      .toArray();
    return NextResponse.json(docs);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch resumes', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = resumeUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // base64 adds ~33% overhead; hard cap at 10 MiB raw to stay under MongoDB's 16 MiB limit
    const MAX_BYTES = 10 * 1024 * 1024;
    if (data.base64 && data.base64.length > MAX_BYTES * 1.4) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
    }

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('resumes');

    if (data.isActive) {
      await collection.updateMany({}, { $set: { isActive: false } });
    }

    const doc = {
      name: data.name,
      mimeType: data.mimeType,
      base64: data.base64,
      isActive: data.isActive || false,
      uploadedAt: new Date(),
    };

    const result = await collection.insertOne(doc);
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to upload resume', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const data = await request.json();
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('resumes');

    if (data.action === 'set_active') {
      if (typeof data.id !== 'string') {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }
      let oid: mongoose.Types.ObjectId;
      try {
        oid = new mongoose.Types.ObjectId(data.id);
      } catch {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      // Confirm the target exists BEFORE deactivating everything — otherwise a
      // bad/stale id would leave the site with no active (downloadable) resume.
      const target = await collection.findOne({ _id: oid });
      if (!target) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
      }
      await collection.updateMany({}, { $set: { isActive: false, updatedAt: new Date() } });
      await collection.updateOne({ _id: oid }, { $set: { isActive: true, updatedAt: new Date() } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update resume', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('resumes');

    await collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete resume', details: error.message },
      { status: 500 }
    );
  }
}
