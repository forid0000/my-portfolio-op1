import { NextResponse } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

// MongoDB-internal databases must never be mutated through the admin UI.
const PROTECTED_DBS = new Set(['admin', 'local', 'config']);

/** True if a write/delete to this target would touch MongoDB internals. */
function isProtectedTarget(dbName: string, collectionName: string): boolean {
  return PROTECTED_DBS.has(dbName) || collectionName.startsWith('system.');
}

export async function GET(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = await connectToDatabase();
    const connection = db.connection;
    const { searchParams } = new URL(request.url);
    const collectionName = searchParams.get('collection');
    const dbName = searchParams.get('db');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const skip = (page - 1) * limit;

    if (!dbName || !collectionName) {
      // List all databases and their collections
      if (!connection.db) {
        return NextResponse.json({ error: 'Database not fully connected yet' }, { status: 500 });
      }

      const adminDb = connection.client.db().admin();
      const dbResult = await adminDb.listDatabases();

      const databases = [];
      for (const dbInfo of dbResult.databases) {
        const db = connection.client.db(dbInfo.name);
        const collections = await db.listCollections().toArray();
        databases.push({
          name: dbInfo.name,
          collections: collections
            .map((c: any) => c.name)
            .filter((n: string) => n !== 'system.views'),
        });
      }
      return NextResponse.json({ databases });
    }

    // List documents for a specific database and collection
    if (!connection.db) {
      return NextResponse.json({ error: 'Database not fully connected yet' }, { status: 500 });
    }

    const collection = connection.client.db(dbName).collection(collectionName);

    let query: any = {};
    if (search) {
      try {
        query._id = new mongoose.Types.ObjectId(search);
      } catch (e) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        };
      }
    }

    const totalCount = await collection.countDocuments(query);
    let sortQuery: any = { _id: -1 };
    if (collectionName === 'oplog.rs' || collectionName.startsWith('system.')) {
      sortQuery = { $natural: -1 };
    }
    const documents = await collection
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort(sortQuery)
      .toArray();

    return NextResponse.json({ documents, totalCount, page, limit });
  } catch (error: any) {
    console.error('Database GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch database data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { dbName, collectionName, id } = await request.json();

    if (!dbName || !collectionName || !id) {
      return NextResponse.json({ error: 'Missing dbName, collectionName, or id' }, { status: 400 });
    }

    if (isProtectedTarget(dbName, collectionName)) {
      return NextResponse.json(
        { error: 'Operation not allowed on system databases/collections' },
        { status: 403 }
      );
    }

    const db = await connectToDatabase();
    const connection = db.connection;
    if (!connection.db) {
      return NextResponse.json({ error: 'Database not fully connected yet' }, { status: 500 });
    }

    const collection = connection.client.db(dbName).collection(collectionName);

    // Parse the ID properly
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch (e) {
      // If it's not a valid ObjectId, we might need to delete by string ID depending on schema
      objectId = id;
    }

    const result = await collection.deleteOne({ _id: objectId });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Database DELETE Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { dbName, collectionName, document } = await request.json();

    if (!dbName || !collectionName || !document) {
      return NextResponse.json(
        { error: 'Missing dbName, collectionName, or document' },
        { status: 400 }
      );
    }

    if (isProtectedTarget(dbName, collectionName)) {
      return NextResponse.json(
        { error: 'Operation not allowed on system databases/collections' },
        { status: 403 }
      );
    }

    const db = await connectToDatabase();
    const connection = db.connection;
    if (!connection.db) {
      return NextResponse.json({ error: 'Database not fully connected yet' }, { status: 500 });
    }

    const collection = connection.client.db(dbName).collection(collectionName);

    let docToInsert = { ...document };
    if (docToInsert._id && typeof docToInsert._id === 'string') {
      try {
        docToInsert._id = new mongoose.Types.ObjectId(docToInsert._id);
      } catch (e) {}
    }

    const result = await collection.insertOne(docToInsert);

    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error: any) {
    console.error('Database POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create document' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { dbName, collectionName, id, document } = await request.json();

    if (!dbName || !collectionName || !id || !document) {
      return NextResponse.json(
        { error: 'Missing dbName, collectionName, id, or document' },
        { status: 400 }
      );
    }

    if (isProtectedTarget(dbName, collectionName)) {
      return NextResponse.json(
        { error: 'Operation not allowed on system databases/collections' },
        { status: 403 }
      );
    }

    const db = await connectToDatabase();
    const connection = db.connection;
    if (!connection.db) {
      return NextResponse.json({ error: 'Database not fully connected yet' }, { status: 500 });
    }

    const collection = connection.client.db(dbName).collection(collectionName);

    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch (e) {
      objectId = id;
    }

    const updateDoc = { ...document };
    delete updateDoc._id; // Prevent updating the immutable _id field

    const result = await collection.replaceOne({ _id: objectId }, updateDoc);

    return NextResponse.json({
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('Database PUT Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update document' },
      { status: 500 }
    );
  }
}
