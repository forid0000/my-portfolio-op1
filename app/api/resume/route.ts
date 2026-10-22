import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('resumes');
    const doc = await collection.findOne({ isActive: true });

    if (!doc || !doc.base64) {
      return new NextResponse('Resume not found. Please upload one in the admin dashboard.', {
        status: 404,
      });
    }

    const buffer = Buffer.from(doc.base64.split(',')[1] || doc.base64, 'base64');

    const headers = new Headers();
    headers.set('Content-Type', doc.mimeType || 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${doc.name || 'resume.pdf'}"`);
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error('Failed to serve resume:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
