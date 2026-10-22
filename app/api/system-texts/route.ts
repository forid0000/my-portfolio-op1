import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'system_content' });

    return NextResponse.json(doc || {});
  } catch (error) {
    // Return empty object on DB failure, so error page falls back to defaults
    return NextResponse.json({});
  }
}
