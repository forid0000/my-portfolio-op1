import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MiB

function slugify(s: string) {
  return (
    (s || 'uncategorized')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'uncategorized'
  );
}

// Upload one image to Cloudinary (with AI auto-tagging via the installed add-ons),
// then persist it as a gallery item in Mongo. Returns the created item + AI suggestions.
export async function POST(request: Request) {
  await configureCloudinary();
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large (max 15 MB)' }, { status: 413 });
    }

    const rawCategory = (formData.get('category') as string) || '';
    const alt = (formData.get('alt') as string) || '';
    const date = (formData.get('date') as string) || new Date().toISOString().slice(0, 10);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Try AI categorization (Imagga add-on). Fall back to a plain upload if the
    // add-on is unavailable so an upload never hard-fails on tagging.
    const baseOpts: Record<string, any> = {
      folder: `gallery/${slugify(rawCategory) || 'uncategorized'}`,
      resource_type: 'image',
    };

    const uploadWith = (opts: Record<string, any>) =>
      new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(opts, (err, result) =>
          err ? reject(err) : resolve(result)
        );
        stream.end(buffer);
      });

    let result: any;
    let aiTags: { tag: string; confidence: number }[] = [];
    try {
      result = await uploadWith({
        ...baseOpts,
        categorization: 'imagga_tagging',
        auto_tagging: 0.5,
      });
      const data = result?.info?.categorization?.imagga_tagging?.data;
      if (Array.isArray(data)) {
        aiTags = data
          .map((d: any) => ({ tag: d.tag?.en || d.tag, confidence: d.confidence }))
          .filter((d: any) => d.tag);
      }
    } catch (e) {
      // Add-on not enabled / failed - retry as a plain upload.
      result = await uploadWith(baseOpts);
    }

    if (Array.isArray(result?.tags)) {
      const existing = new Set(aiTags.map((t) => t.tag));
      for (const t of result.tags) {
        if (!existing.has(t)) aiTags.push({ tag: t, confidence: 1 });
      }
    }

    const db = await connectToDatabase();
    const col = db.connection.client.db('portfolio_cms').collection('gallery');

    // Resolve a category: explicit choice wins.
    // If 'Auto', force the AI to only pick from ALREADY EXISTING categories.
    let category = rawCategory.trim();
    if (!category) {
      const existingCats = (await col.distinct('category')) as string[];
      const existingSet = new Set(existingCats.map((c: string) => c.toLowerCase()));

      let matched = null;
      // Find the first AI tag that matches an existing category
      for (const t of aiTags) {
        if (existingSet.has(t.tag.toLowerCase())) {
          matched = existingCats.find((c: string) => c.toLowerCase() === t.tag.toLowerCase());
          break;
        }
      }
      category = matched || 'uncategorized';
    }

    const last = await col.find({}).sort({ order: -1 }).limit(1).toArray();
    const order = (last[0]?.order || 0) + 1;

    const doc = {
      public_id: result.public_id,
      src: result.secure_url,
      alt: alt || category,
      date,
      width: result.width,
      height: result.height,
      category,
      tags: aiTags.map((t) => t.tag).slice(0, 5),
      order,
      updatedAt: new Date(),
    };

    await col.updateOne({ public_id: doc.public_id }, { $set: doc }, { upsert: true });

    revalidatePublicContent();
    return NextResponse.json({ success: true, item: doc, suggestedTags: aiTags.slice(0, 12) });
  } catch (error: any) {
    console.error('Gallery upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
