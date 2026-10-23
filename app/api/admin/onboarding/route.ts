import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminSession } from '@/lib/auth';
import { applyOnboardingAction, getOnboardingOverview } from '@/lib/onboarding';
import { ONBOARDING_ITEM_IDS } from '@/lib/onboarding-types';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// The admin's getting-started checklist and tour state. Completion of each item
// is detected from the real configuration; this route only stores the owner's own
// choices (tour seen, items skipped, checklist hidden).

const itemId = z.enum(ONBOARDING_ITEM_IDS);

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('welcome-seen') }),
  z.object({ action: z.literal('tour-done') }),
  z.object({ action: z.literal('skip'), id: itemId }),
  z.object({ action: z.literal('unskip'), id: itemId }),
  z.object({ action: z.literal('dismiss-checklist') }),
  z.object({ action: z.literal('show-checklist') }),
  z.object({ action: z.literal('reset') }),
]);

export async function GET() {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await getOnboardingOverview());
  } catch (error) {
    console.error('Onboarding overview error:', error);
    return NextResponse.json({ error: 'Could not load the setup checklist.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Its own bucket, so ticking through a checklist never eats the content-save budget.
  const rl = rateLimit(`admin-onboarding:${clientIp(request)}`, 120, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    await applyOnboardingAction(parsed.data);
    return NextResponse.json(await getOnboardingOverview());
  } catch (error) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ error: 'Could not save your choice.' }, { status: 500 });
  }
}
