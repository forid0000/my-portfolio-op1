import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';
import { getIntegrations } from '@/lib/integrations';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { propagateCloudinaryDelete } from '@/lib/media-sync';

// Light shape validation only - this is a power-tool Cloudinary asset browser
// (analogous to the raw Mongo data console), so the goal is just preventing
// type confusion before values reach the Cloudinary SDK, not business rules.
const folderNameSchema = z.object({ folder_name: z.string().min(1) });
const deleteBodySchema = z.object({
  folder_path: z.string().min(1).optional(),
  public_ids: z.array(z.string().min(1)).min(1).optional(),
});

export async function GET(request: Request) {
  await configureCloudinary();
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const folder = searchParams.get('folder') || '';

    if (action === 'folders') {
      const result = await cloudinary.api.root_folders();
      return NextResponse.json({ folders: result.folders });
    }

    if (action === 'resources') {
      const options: any = {
        type: 'upload',
        max_results: 50,
      };
      if (folder) {
        options.prefix = folder + '/';
      }
      const result = await cloudinary.api.resources(options);
      return NextResponse.json({ resources: result.resources });
    }

    if (action === 'signature') {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign: Record<string, any> = {
        timestamp,
      };
      if (folder) {
        paramsToSign.folder = folder;
      }

      const creds = await getIntegrations([
        'CLOUDINARY_API_SECRET',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
      ] as const);
      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        creds.CLOUDINARY_API_SECRET as string
      );

      return NextResponse.json({
        signature,
        timestamp,
        cloud_name: creds.CLOUDINARY_CLOUD_NAME,
        api_key: creds.CLOUDINARY_API_KEY,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Cloudinary GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await configureCloudinary();
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle folder creation
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const parsed = folderNameSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const result = await cloudinary.api.create_folder(parsed.data.folder_name);
      return NextResponse.json({ success: true, result });
    }

    // Handle file upload
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderRaw = formData.get('folder');
    const folder = typeof folderRaw === 'string' ? folderRaw : '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload via stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({ success: true, result: uploadResult });
  } catch (error: any) {
    console.error('Cloudinary POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await configureCloudinary();
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const raw = await request.json();
    const parsed = deleteBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Handle folder deletion
    if (body.folder_path) {
      const result = await cloudinary.api.delete_folder(body.folder_path);
      return NextResponse.json({ success: true, result });
    }

    // Handle bulk resource deletion
    const { public_ids } = body;
    if (!public_ids || public_ids.length === 0) {
      return NextResponse.json({ error: 'No public_ids or folder_path provided' }, { status: 400 });
    }

    // Use api.delete_resources for bulk deletion (up to 100 at a time)
    const result = await cloudinary.api.delete_resources(public_ids);
    await propagateCloudinaryDelete(
      public_ids.filter((id) => ['deleted', 'not_found'].includes(result?.deleted?.[id]))
    );
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Cloudinary DELETE Error:', error);
    const errorMessage = error?.error?.message || error?.message || 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
