// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearFieldErrors,
  describePath,
  findControl,
  friendlyMessage,
  humanizeKey,
  isSideBySide,
  labelMatchesKey,
  markFieldInvalid,
  parseIssues,
  reportFieldIssues,
  rowOrdinal,
  templateOf,
  valueAt,
  type FieldIssue,
} from '@/lib/field-errors';

describe('field error helpers', () => {
  it('reads Zod issues from an API error body and ignores anything else', () => {
    const body = {
      error: 'Invalid payload data',
      details: [
        {
          code: 'too_small',
          origin: 'string',
          minimum: 1,
          path: ['projects', 2, 'title'],
          message: 'x',
        },
        { path: 'oops', message: 'bad shape' },
        'nope',
      ],
    };
    const issues = parseIssues(body);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual(['projects', 2, 'title']);
    expect(parseIssues(null)).toEqual([]);
    expect(parseIssues({ details: 'text' })).toEqual([]);
  });

  it('turns keys and paths into words people use', () => {
    expect(humanizeKey('headerName')).toBe('Header name');
    expect(humanizeKey('githubProfileUrl')).toBe('Github profile URL');
    expect(humanizeKey('cta_label')).toBe('CTA label');
    expect(describePath(['socials', 2, 'href'])).toBe('Socials #3 > Address');
    expect(describePath([0, 'name'])).toBe('Item 1 > Name');
    expect(describePath([])).toBe('This field');
  });

  it('explains issues in plain language', () => {
    const required: FieldIssue = {
      path: ['a'],
      message: 'Too small',
      code: 'too_small',
      origin: 'string',
      minimum: 1,
    };
    expect(friendlyMessage(required)).toBe('This field is required.');
    expect(friendlyMessage({ ...required, minimum: 15 })).toBe('Must be at least 15 characters.');
    expect(
      friendlyMessage({
        path: ['u'],
        message: 'Invalid URL',
        code: 'invalid_format',
        format: 'url',
      })
    ).toMatch(/full web address/);
    expect(
      friendlyMessage({
        path: ['u'],
        message: 'Invalid input: expected string, received undefined',
        code: 'invalid_type',
      })
    ).toBe('This field is required.');
    expect(friendlyMessage({ path: ['x'], message: 'Slug is already taken' })).toBe(
      'Slug is already taken'
    );
  });

  it('finds values and row positions inside a payload', () => {
    const payload = {
      socials: [
        { label: 'A', href: '' },
        { label: 'B', href: '' },
        { label: 'C', href: '' },
      ],
    };
    expect(valueAt(payload, ['socials', 1, 'label'])).toBe('B');
    expect(valueAt(payload, ['nope', 1])).toBeUndefined();
    expect(templateOf(['socials', 2, 'href'])).toBe('socials.#.href');
    expect(rowOrdinal(payload, ['socials', 0, 'href'])).toBe(0);
    expect(rowOrdinal(payload, ['socials', 2, 'href'])).toBe(2);
  });

  it('matches labels to field names', () => {
    expect(labelMatchesKey('Header Name', 'headerName')).toBe(true);
    expect(labelMatchesKey('URL (https://...)', 'href')).toBe(true);
    expect(labelMatchesKey('Description', 'title')).toBe(false);
    expect(labelMatchesKey('', 'title')).toBe(false);
  });
});

describe('highlighting the field at fault', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => {};
    document.body.innerHTML = `
      <form>
        <div><label>Brand Name</label><input type="text" value="" /></div>
        <div><label>Header Name</label><input type="text" value="Me" /></div>
        <ul>
          <li><input placeholder="Label" value="Mail" /><input placeholder="URL" value="" /></li>
          <li><input placeholder="Label" value="Site" /><input placeholder="URL" value="oops" /></li>
          <li><input placeholder="Label" value="Docs" /><input placeholder="URL" value="" /></li>
        </ul>
        <input data-field="exact.field" value="x" />
      </form>`;
    // happy-dom has no layout, so pretend every control is visible
    for (const el of Array.from(document.querySelectorAll('input'))) {
      Object.defineProperty(el, 'offsetWidth', { value: 100, configurable: true });
    }
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses data-field when the form provides it', () => {
    const el = findControl({ path: ['exact', 'field'], message: 'bad' }, {});
    expect(el?.getAttribute('data-field')).toBe('exact.field');
  });

  it('finds an empty required field by its label', () => {
    const el = findControl(
      { path: ['brandName'], message: 'Required' },
      { brandName: '', headerName: 'Me' }
    );
    expect(el?.previousElementSibling?.textContent).toBe('Brand Name');
  });

  it('finds the right row among repeated fields', () => {
    const payload = {
      socials: [
        { label: 'Mail', href: '' },
        { label: 'Site', href: 'oops' },
        { label: 'Docs', href: '' },
      ],
    };
    const second = findControl({ path: ['socials', 1, 'href'], message: 'bad url' }, payload);
    expect((second as HTMLInputElement).value).toBe('oops');
    const third = findControl({ path: ['socials', 2, 'href'], message: 'required' }, payload);
    expect(third?.closest('li')?.querySelector('input')?.getAttribute('value')).toBe('Docs');
    const first = findControl({ path: ['socials', 0, 'href'], message: 'required' }, payload);
    expect(first?.closest('li')?.querySelector('input')?.getAttribute('value')).toBe('Mail');
  });

  it('marks a field, writes the reason under it, and removes both on request', () => {
    const input = document.querySelector('input') as HTMLInputElement;
    markFieldInvalid(input, 'Brand name is required.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const note = input.nextElementSibling as HTMLElement;
    expect(note.textContent).toBe('Brand name is required.');
    expect(note.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-describedby')).toBe(note.id);
    clearFieldErrors();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(document.querySelector('.field-error')).toBeNull();
  });

  it('knows which containers lay their children out side by side', () => {
    expect(isSideBySide('flex', 'row')).toBe(true);
    expect(isSideBySide('inline-flex', 'row-reverse')).toBe(true);
    expect(isSideBySide('flex', 'column')).toBe(false);
    expect(isSideBySide('block', 'row')).toBe(false);
    expect(isSideBySide('grid', 'row')).toBe(false);
  });

  it('writes the reason under a row of fields, not as one more column inside it', () => {
    document.body.innerHTML = `
      <div id="row" style="display:flex;flex-direction:row">
        <input id="label" value="https://example.com" />
        <input id="url" value="" />
      </div>
      <div id="stack" style="display:flex;flex-direction:column">
        <input id="solo" value="" />
      </div>`;
    const url = document.getElementById('url') as HTMLInputElement;
    markFieldInvalid(url, 'Add an address.');
    const row = document.getElementById('row') as HTMLElement;
    expect(url.nextElementSibling).toBeNull();
    expect(row.nextElementSibling?.className).toBe('field-error');
    expect(row.nextElementSibling?.textContent).toBe('Add an address.');
    expect(url.getAttribute('aria-describedby')).toBe(row.nextElementSibling?.id);

    // A column keeps the message directly under the field.
    const solo = document.getElementById('solo') as HTMLInputElement;
    markFieldInvalid(solo, 'Required.');
    expect(solo.nextElementSibling?.className).toBe('field-error');

    clearFieldErrors();
    expect(document.querySelector('.field-error')).toBeNull();
  });

  it('highlights every field it can match, focuses the first, and reports the rest', () => {
    const payload = { brandName: '', ghost: '' };
    const result = reportFieldIssues(
      [
        {
          path: ['brandName'],
          message: 'Required',
          code: 'too_small',
          origin: 'string',
          minimum: 1,
        },
        {
          path: ['socials', 1, 'href'],
          message: 'Invalid URL',
          code: 'invalid_format',
          format: 'url',
        },
        { path: ['nowhereToBeFound'], message: 'Nope' },
      ],
      { ...payload, socials: [{}, { href: 'oops' }] }
    );
    expect(result.highlighted).toBe(2);
    expect(result.unmatched).toHaveLength(1);
    expect(result.summary).toContain('Brand name: This field is required.');
    expect(result.summary).toContain('and 2 more');
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(2);
    expect(document.activeElement?.previousElementSibling?.textContent).toBe('Brand Name');
  });

  it('clears the red box when the person edits the field', () => {
    const input = document.querySelector('input') as HTMLInputElement;
    reportFieldIssues([{ path: ['brandName'], message: 'Required' }], { brandName: '' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(document.querySelector('.field-error')).toBeNull();
  });
});
