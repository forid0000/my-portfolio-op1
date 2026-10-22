import { after } from 'next/server';
import { getIntegrations } from '@/lib/integrations';

/**
 * Optional push notification to a GitHub profile README repository.
 *
 * If your GitHub profile README (the special `<username>/<username>` repository)
 * is generated from this CMS by a scheduled workflow, a content edit could take
 * up to a day to show up on the profile. Firing a `repository_dispatch` on save
 * closes that gap to roughly a minute.
 *
 * Opt-in: nothing happens unless BOTH the profile repository (e.g.
 * "your-username/your-username") and the access token are set in Admin ->
 * Security -> Integrations (the `GITHUB_PROFILE_REPO` / `GITHUB_DISPATCH_TOKEN`
 * environment variables are an optional fallback). Your workflow must listen for
 * `repository_dispatch` with type `cms-updated`.
 *
 * Deliberately best-effort:
 *
 *  - it runs via `after()`, so it never delays the admin response;
 *  - it never throws, so a GitHub outage (or a missing/expired token) can never
 *    turn a successful CMS save into a failed one;
 *  - with no repo/token configured it is a no-op, so local and preview environments
 *    don't poke the production profile.
 *
 * The token is a fine-grained PAT scoped to `contents: write` on the profile repo
 * only — the minimum GitHub accepts for repository_dispatch.
 */
const EVENT_TYPE = 'cms-updated';
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function notifyProfileReadme(section: string): void {
  after(async () => {
    try {
      const { GITHUB_DISPATCH_TOKEN: token, GITHUB_PROFILE_REPO } = await getIntegrations([
        'GITHUB_DISPATCH_TOKEN',
        'GITHUB_PROFILE_REPO',
      ] as const);
      const repo = GITHUB_PROFILE_REPO?.trim();
      if (!token || !repo) return;
      if (!REPO_PATTERN.test(repo)) {
        console.warn(
          '[github-dispatch] The profile repository must look like "owner/repo"; skipping.'
        );
        return;
      }

      const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'my-portfolio-op1-cms',
        },
        body: JSON.stringify({
          event_type: EVENT_TYPE,
          client_payload: { section },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.warn(`[github-dispatch] ${section}: HTTP ${res.status} from GitHub`);
      }
    } catch (error) {
      console.warn(
        `[github-dispatch] ${section}: ${error instanceof Error ? error.message : 'failed'}`
      );
    }
  });
}
