import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GENERATOR,
  PROJECT_CREDIT,
  humansTxt,
  llmsCreditLine,
  projectCreditJsonLd,
} from '@/lib/project-credit';
import { safeJsonLd } from '@/lib/json-ld';

const root = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|mjs)$/.test(name) ? [path] : [];
  });
}

describe('project credit', () => {
  it('describes the software with its creator as a Person', () => {
    const node = projectCreditJsonLd();
    expect(node['@type']).toBe('SoftwareSourceCode');
    expect(node.codeRepository).toBe(PROJECT_CREDIT.repository);
    expect(node.author['@type']).toBe('Person');
    expect(node.author.url).toBe(PROJECT_CREDIT.author.url);
    expect(node.author.sameAs.length).toBeGreaterThan(0);
  });

  it('uses https addresses only', () => {
    const urls = [
      PROJECT_CREDIT.repository,
      PROJECT_CREDIT.licenseUrl,
      PROJECT_CREDIT.author.url,
      ...PROJECT_CREDIT.author.sameAs,
    ];
    for (const url of urls) expect(url, url).toMatch(/^https:\/\//);
  });

  it('survives safeJsonLd as valid JSON', () => {
    const wrapped = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      isBasedOn: projectCreditJsonLd(),
    };
    expect(JSON.parse(safeJsonLd(wrapped)).isBasedOn.name).toBe(PROJECT_CREDIT.name);
  });

  it('names the project in the generator tag, humans.txt and llms.txt', () => {
    expect(GENERATOR).toContain(PROJECT_CREDIT.name);
    expect(GENERATOR).toContain(PROJECT_CREDIT.repository);
    expect(humansTxt()).toContain(PROJECT_CREDIT.author.name);
    expect(humansTxt()).toContain(PROJECT_CREDIT.repository);
    expect(llmsCreditLine()).toContain(PROJECT_CREDIT.author.url);
  });

  it('is the only place in the source that names the creator', () => {
    const allowed = new Set(['lib/project-credit.ts']);
    const needle = /habibullah/i;
    const hits = ['app', 'components', 'hooks', 'lib', 'scripts']
      .flatMap((dir) => sourceFiles(join(root, dir)))
      .map((file) => relative(root, file))
      .filter((file) => !allowed.has(file))
      .filter((file) => needle.test(readFileSync(join(root, file), 'utf8')));
    expect(hits).toEqual([]);
  });

  it('is never used as the author of a deployed page', () => {
    const layout = readFileSync(join(root, 'app', 'layout.tsx'), 'utf8');
    // The credit may only be the software's `isBasedOn` and `generator`; `authors`, `creator`
    // and the Person node belong to the site owner (CMS identity).
    expect(layout).toContain('isBasedOn: projectCreditJsonLd()');
    expect(layout).toContain('generator: GENERATOR');
    expect(layout).not.toMatch(/PROJECT_CREDIT/);
  });
});
