import connectToDatabase from '@/lib/db';

/**
 * True when a resume is uploaded and active (Admin -> Media Manager). The "Download CV" button
 * only appears then, so visitors never get a dead link. Fail-safe: any error reads as "no resume".
 * The resume itself is stored in MongoDB (collection `resumes`) and served by /api/resume.
 */
export async function hasActiveResume(): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('resumes')
      .findOne({ isActive: true }, { projection: { _id: 1 } });
    return !!doc;
  } catch {
    return false;
  }
}
