import { NextResponse } from 'next/server';
import { revalidateSiteChrome } from '@/lib/revalidate';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { THEME_DEFAULTS, sanitizeTheme, invalidateThemeCache } from '@/lib/theme';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'theme_content' });
    return NextResponse.json(doc ? sanitizeTheme(doc as any) : THEME_DEFAULTS);
  } catch (error: any) {
    console.error('theme GET Error:', error);
    return NextResponse.json(THEME_DEFAULTS);
  }
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    // Reject anything that isn't a valid color/radius (defense against CSS injection).
    const theme = sanitizeTheme(data);

    const db = await connectToDatabase();
    await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .updateOne(
        { type: 'theme_content' },
        { $set: { ...theme, type: 'theme_content', updatedAt: new Date() } },
        { upsert: true }
      );

    invalidateThemeCache();
    revalidateSiteChrome();
    return NextResponse.json({ success: true, theme });
  } catch (error: any) {
    console.error('theme Save Error:', error);
    return NextResponse.json(
      { error: 'Failed to update theme', details: error.message || 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
