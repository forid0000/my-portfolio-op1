import { NextResponse } from 'next/server';
import { verifyNotesSession } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  if (!(await verifyNotesSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');

    const { searchParams } = new URL(request.url);

    const idParam = searchParams.get('id');
    if (idParam) {
      let oid: mongoose.Types.ObjectId;
      try {
        oid = new mongoose.Types.ObjectId(idParam);
      } catch {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      const note = await collection.findOne({ _id: oid });
      if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ note });
    }

    const search = searchParams.get('search') || '';
    const tagsParam = searchParams.get('tags') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    if (tagsParam) {
      const tagList = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) query.tags = { $in: tagList };
    }

    const [totalCount, notes, allTags] = await Promise.all([
      collection.countDocuments(query),
      collection.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.distinct('tags', {}),
    ]);

    return NextResponse.json({
      notes,
      totalCount,
      page,
      limit,
      allTags: (allTags as string[]).filter(Boolean).sort(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await verifyNotesSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await request.json();
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');

    const newNote = {
      title: typeof data.title === 'string' ? data.title.trim() : '',
      content: typeof data.content === 'string' ? data.content.trim() : '',
      tags: Array.isArray(data.tags)
        ? data.tags.filter((t: any) => typeof t === 'string' && t)
        : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(newNote);
    const note = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await verifyNotesSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');

    const updateDoc = {
      title: typeof data.title === 'string' ? data.title.trim() : '',
      content: typeof data.content === 'string' ? data.content.trim() : '',
      tags: Array.isArray(data.tags)
        ? data.tags.filter((t: any) => typeof t === 'string' && t)
        : [],
      updatedAt: new Date(),
    };

    let oid: mongoose.Types.ObjectId;
    try {
      oid = new mongoose.Types.ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    await collection.updateOne({ _id: oid }, { $set: updateDoc });
    const note = await collection.findOne({ _id: oid });
    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await verifyNotesSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    let oid: mongoose.Types.ObjectId;
    try {
      oid = new mongoose.Types.ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');

    const result = await collection.deleteOne({ _id: oid });
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
