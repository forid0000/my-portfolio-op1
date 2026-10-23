import { NextResponse } from 'next/server';
import { z } from 'zod';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { propagateCloudinaryDelete, propagateCloudinaryRename } from '@/lib/media-sync';

// Light shape validation only - this is a power-tool Cloudinary media browser
// (analogous to the raw Mongo data console), so the goal is just preventing
// type confusion before values reach the Cloudinary SDK, not business rules.
const renameSchema = z.object({
  from_public_id: z.string().min(1),
  to_public_id: z.string().min(1),
});
const uploadSchema = z.object({
  imageBase64: z.string().min(1),
  folder: z.string().min(1).optional(),
});
const pathSchema = z.object({ path: z.string().min(1) });
const deleteResourcesSchema = z.object({ public_ids: z.array(z.string().min(1)).min(1) });

export async function GET(request: Request) {
  await configureCloudinary();
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'resources'; // 'folders' or 'resources'
  const path = searchParams.get('path'); // For folders (e.g., 'PPIC')
  const folder = searchParams.get('folder'); // For resources
  const nextCursor = searchParams.get('next_cursor');

  try {
    if (action === 'folders') {
      let result;
      if (!path) {
        // Get root folders
        result = await cloudinary.api.root_folders();
      } else {
        // Get subfolders of a specific path
        result = await cloudinary.api.sub_folders(path);
      }
      return NextResponse.json({ folders: result.folders });
    }

    if (action === 'resources') {
      const options: any = {
        type: 'upload',
        max_results: 50,
        direction: -1, // newest first
      };

      if (folder) {
        options.prefix = folder + '/';
      }

      if (nextCursor) {
        options.next_cursor = nextCursor;
      }

      const result = await cloudinary.api.resources(options);

      // Cloudinary's prefix search returns ALL resources that start with that prefix,
      // including resources in deeply nested subfolders.
      // To simulate a file explorer, we should only return files that are strictly in THIS folder level.
      const filteredResources = folder
        ? result.resources.filter(
            (res: any) =>
              res.asset_folder === folder ||
              res.public_id.split('/').slice(0, -1).join('/') === folder
          )
        : result.resources; // root shows all files across all folders

      return NextResponse.json({
        resources: filteredResources.map((res: any) => ({
          public_id: res.public_id,
          secure_url: res.secure_url,
          format: res.format,
          width: res.width,
          height: res.height,
          bytes: res.bytes,
          created_at: res.created_at,
        })),
        next_cursor: result.next_cursor || null,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Cloudinary fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media', details: error.message },
      { status: 500 }
    );
  }
}

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

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'rename') {
      const raw = await request.json();
      const parsed = renameSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const { from_public_id, to_public_id } = parsed.data;

      const result = await cloudinary.uploader.rename(from_public_id, to_public_id, {
        overwrite: false,
      });
      await propagateCloudinaryRename(from_public_id, to_public_id, result?.secure_url);
      return NextResponse.json({ success: true, resource: result });
    }

    if (action === 'upload') {
      const raw = await request.json();
      const parsed = uploadSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const { imageBase64, folder } = parsed.data;

      const uploadOptions: any = { resource_type: 'auto' };
      if (folder) uploadOptions.folder = folder;

      const uploadResponse = await cloudinary.uploader.upload(imageBase64, uploadOptions);

      return NextResponse.json({
        success: true,
        resource: {
          public_id: uploadResponse.public_id,
          secure_url: uploadResponse.secure_url,
          format: uploadResponse.format,
          width: uploadResponse.width,
          height: uploadResponse.height,
          bytes: uploadResponse.bytes,
          created_at: uploadResponse.created_at,
        },
      });
    }

    if (action === 'create_folder') {
      const raw = await request.json();
      const parsed = pathSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await cloudinary.api.create_folder(parsed.data.path);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Invalid POST action' }, { status: 400 });
  } catch (error: any) {
    console.error('Cloudinary POST error:', error);
    return NextResponse.json({ error: 'Action failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'folder') {
      const raw = await request.json();
      const parsed = pathSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }

      // Deletes an empty folder
      const result = await cloudinary.api.delete_folder(parsed.data.path);
      return NextResponse.json({ success: true, result });
    }

    // Default action: Delete resources
    const raw = await request.json();
    const parsed = deleteResourcesSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Use delete_resources for batch deletion
    const result = await cloudinary.api.delete_resources(parsed.data.public_ids);

    // Saved content must not keep pointing at files that are now gone.
    await propagateCloudinaryDelete(
      parsed.data.public_ids.filter((id) =>
        ['deleted', 'not_found'].includes(result?.deleted?.[id])
      )
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete media', details: error.message },
      { status: 500 }
    );
  }
}
