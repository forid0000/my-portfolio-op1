import { describe, expect, it } from 'vitest';
import {
  FIELD_HELP,
  GROUP_GUIDE,
  GUIDES,
  GUIDES_CHECKED,
  OFFICIAL_LINK_HOSTS,
  setupProgress,
  type GuideId,
} from '@/lib/admin-guides';
import { INTEGRATION_FIELDS, INTEGRATION_GROUPS } from '@/lib/integrations';

const IDS = Object.keys(GUIDES) as GuideId[];

describe('admin key guides', () => {
  it('has help for every key and credential box of the Security page', () => {
    for (const field of INTEGRATION_FIELDS) {
      const help = FIELD_HELP[field.key];
      expect(help, field.key).toBeDefined();
      expect(help.where.length, field.key).toBeGreaterThan(15);
    }
    for (const key of Object.keys(FIELD_HELP)) {
      expect(
        INTEGRATION_FIELDS.some((f) => f.key === key),
        `${key} has no box`
      ).toBe(true);
    }
  });

  it('has a guide for every group of integrations', () => {
    for (const group of Object.keys(INTEGRATION_GROUPS)) {
      const id = GROUP_GUIDE[group];
      expect(id, group).toBeDefined();
      expect(GUIDES[id], group).toBeDefined();
    }
  });

  it.each(IDS)('%s: explains what, why, how, and how to check', (id) => {
    const g = GUIDES[id];
    expect(g.id).toBe(id);
    expect(g.title.length).toBeGreaterThan(5);
    expect(g.why.length).toBeGreaterThan(60);
    expect(g.cost.length).toBeGreaterThan(3);
    expect(g.time.length).toBeGreaterThan(3);
    expect(g.ifSkipped.length).toBeGreaterThan(10);
    expect(g.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of g.steps) expect(step.title.length).toBeGreaterThan(10);
    expect(g.tips.length).toBeGreaterThanOrEqual(1);
    expect(g.check.length).toBeGreaterThanOrEqual(1);
  });

  it('only links to the providers’ own pages, over https', () => {
    const hosts = new Set<string>(OFFICIAL_LINK_HOSTS);
    let count = 0;
    for (const g of Object.values(GUIDES)) {
      for (const link of g.links) {
        const url = new URL(link.href);
        expect(url.protocol, link.href).toBe('https:');
        expect(hosts.has(url.hostname), `${link.href} is not an allowed site`).toBe(true);
        expect(link.label.length).toBeGreaterThan(3);
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(15);
  });

  it('has no real secret, address or person in the examples', () => {
    const text = JSON.stringify({ GUIDES, FIELD_HELP });
    expect(text).not.toMatch(/AKIA|sk_live|ghp_[A-Za-z0-9]{10}|xox[bap]-|-----BEGIN/);
    expect(text).not.toMatch(/@gmail\.com|@outlook\.com|@yahoo\.com/i);
  });

  it('lists the SMTP providers with everything a beginner has to type', () => {
    const providers = GUIDES.smtp.providers ?? [];
    expect(providers.map((p) => p.name)).toEqual(['Brevo', 'Gmail', 'Resend']);
    for (const p of providers) {
      for (const value of Object.values(p)) expect(value.length).toBeGreaterThan(1);
    }
    expect(providers[0].host).toBe('smtp-relay.brevo.com');
    expect(providers[1].host).toBe('smtp.gmail.com');
    expect(providers[2].host).toBe('smtp.resend.com');
    expect(providers[2].username).toBe('resend');
  });

  it('shows when it was last checked against the providers’ docs', () => {
    expect(GUIDES_CHECKED).toMatch(/^[A-Z][a-z]+ 20\d\d$/);
  });

  it('keeps the profile workflow in step with the event the site sends', () => {
    const code = GUIDES.github.steps.map((s) => s.code ?? '').join('\n');
    expect(code).toContain('repository_dispatch');
    expect(code).toContain('cms-updated');
  });
});

describe('setup checklist', () => {
  const none = {
    adminHasPassword: false,
    notesHasPassword: false,
    notesQuickUnlock: false,
    fieldStates: {},
  };
  const byId = (items: ReturnType<typeof setupProgress>) =>
    Object.fromEntries(items.map((i) => [i.id, i]));

  it('starts with only the always-on authenticator done', () => {
    const items = byId(setupProgress(none));
    expect(items['admin-signin'].done).toBe(true);
    for (const id of ['admin-password', 'email', 'cloudinary', 'notes-vault', 'github']) {
      expect(items[id].done, id).toBe(false);
    }
    expect(items.email.optional).toBe(false);
    expect(items.github.optional).toBe(true);
  });

  it('counts a group as done only when all its required boxes are set (here or in the environment)', () => {
    const states = {
      SMTP_HOST: 'admin',
      SMTP_USER: 'env',
      SMTP_PASS: 'admin',
      CONTACT_TO_EMAIL: 'unset',
      CLOUDINARY_CLOUD_NAME: 'admin',
      CLOUDINARY_API_KEY: 'admin',
      CLOUDINARY_API_SECRET: 'admin',
    } as const;
    let items = byId(setupProgress({ ...none, fieldStates: { ...states } }));
    expect(items.email.done).toBe(false);
    expect(items.cloudinary.done).toBe(true);
    items = byId(setupProgress({ ...none, fieldStates: { ...states, CONTACT_TO_EMAIL: 'env' } }));
    expect(items.email.done).toBe(true);
  });

  it('notes unlock is done with a password or with quick unlock', () => {
    expect(byId(setupProgress({ ...none, notesHasPassword: true }))['notes-vault'].done).toBe(true);
    expect(byId(setupProgress({ ...none, notesQuickUnlock: true }))['notes-vault'].done).toBe(true);
  });

  it('every item points at an anchor on the page', () => {
    for (const item of setupProgress(none)) expect(item.href).toMatch(/^#[a-z-]+$/);
  });
});
