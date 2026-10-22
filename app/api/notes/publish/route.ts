import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyNotesSession } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

// GET /api/notes/publish?slug=xxx&excludeId=yyy - check slug availability
export async function GET(request: Request) {
  if (!(await verifyNotesSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim().toLowerCase();
    const excludeId = searchParams.get('excludeId') || '';

    if (!slug) return NextResponse.json({ available: false, error: 'Slug required' });

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');

    const query: Record<string, unknown> = { slug };
    if (excludeId) {
      try {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      } catch {
        /* invalid id, ignore */
      }
    }

    const existing = await collection.findOne(query, { projection: { _id: 1 } });
    return NextResponse.json({ available: !existing });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// PATCH /api/notes/publish - publish or unpublish a note
export async function PATCH(request: Request) {
  if (!(await verifyNotesSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, published, slug } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');

    let oid: mongoose.Types.ObjectId;
    try {
      oid = new mongoose.Types.ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};

    if (published === true) {
      if (!slug?.trim())
        return NextResponse.json({ error: 'Slug required to publish' }, { status: 400 });

      const cleanSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Conflict check - exclude current note from the search
      const conflict = await collection.findOne(
        { slug: cleanSlug, _id: { $ne: oid } },
        { projection: { _id: 1 } }
      );
      if (conflict) {
        return NextResponse.json({ error: 'Slug already taken', conflict: true }, { status: 409 });
      }

      update.published = true;
      update.slug = cleanSlug;
      update.publishedAt = new Date();
    } else if (published === false) {
      update.published = false;
      // Keep slug stored so it can be re-used on republish
    }

    await collection.updateOne({ _id: oid }, { $set: update });
    const note = await collection.findOne({ _id: oid });

    // On-demand revalidation: the notes list, the individual note page, and the
    // sitemap all reflect published state, so refresh them the moment it changes
    // (public note pages stay static + on-demand — no timer writes).
    revalidatePath('/notes');
    if (note?.slug) revalidatePath(`/notes/${note.slug}`);
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ success: true, note });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
