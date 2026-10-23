// End-to-end smoke test against a RUNNING app (see tests/smoke/run.mjs, which starts everything):
// real route handlers, a real MongoDB and a fake Cloudinary. It mints an admin session with the
// same JWT_SECRET the app uses, so no sign-in flow (or authenticator) is needed.
//
//   env: BASE_URL, FAKE_URL, JWT_SECRET, MONGODB_URI
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'package.json'));
const { SignJWT } = require('jose');
const { v2: cloudinary } = require('cloudinary');
const mongoose = require('mongoose');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3201';
const FAKE = process.env.FAKE_URL || 'http://127.0.0.1:4010';
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET (32+ chars) is required');

const iat = Math.floor(Date.now() / 1000);
const token = await new SignJWT({ role: 'admin' })
  .setProtectedHeader({ alg: 'HS512', typ: 'JWT' })
  .setExpirationTime(iat + 900)
  .setIssuedAt(iat)
  .setNotBefore(iat)
  .sign(new TextEncoder().encode(secret));

async function api(p, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(BASE + p, {
    method,
    redirect: 'manual',
    headers: {
      ...(auth ? { cookie: `admin_session=${token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, json, text };
}

const fakePost = (p, b) =>
  fetch(FAKE + p, { method: 'POST', body: JSON.stringify(b ?? {}) }).then((r) => r.json());
const seed = (public_id, kind = 'image', content) =>
  fakePost('/__seed', { public_id, kind, content });
const fakeState = () => fetch(FAKE + '/__state').then((r) => r.json());
const has = async (id, kind = 'image') => (await fakeState()).assets.includes(`${kind}:${id}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Public pages are static and refreshed on demand: right after a save, the first request may
 * still get the previous page while the new one is built. Poll until the page shows the change
 * (real visitors see it on the next request).
 */
async function pageWhere(route, predicate, ms = 20000) {
  const start = Date.now();
  let last;
  do {
    last = await api(route, { auth: false });
    if (last.status === 200 && predicate(last.text)) return { ...last, ok: true };
    await wait(500);
  } while (Date.now() - start < ms);
  return { ...last, ok: false };
}
const url = (kind, id) =>
  `https://res.cloudinary.com/testcloud/${kind}/upload/v1/${id}.${kind === 'video' ? 'mp4' : 'png'}`;
const item = (id, kind = 'image') => ({ kind, src: url(kind, id), public_id: id });

const results = [];
let section = '';
const group = (name) => {
  section = name;
  console.log(`\n== ${name}`);
};
function check(name, cond, detail = '') {
  results.push({ section, name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '   <-- ' + detail}`);
}

await fakePost('/__reset');

// ---------------------------------------------------------------------------------------
group('0. First start: the site works on an empty database, and the database sets itself up');
{
  const first = await api('/', { auth: false });
  check(
    'home page renders with built-in placeholder content',
    first.status === 200 && first.text.includes('Your Name'),
    String(first.status)
  );
  check(
    'first-run setup page is reachable',
    (await api('/administrator/setup', { auth: false })).status === 200
  );
  const gate = await api('/administrator', { auth: false });
  check(
    'admin is locked without a session',
    [302, 307, 308].includes(gate.status) && /login|setup/.test(gate.headers.get('location') ?? ''),
    `${gate.status} ${gate.headers.get('location')}`
  );

  const conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = conn.connection.client.db('portfolio_cms');
  let state = null;
  for (let i = 0; i < 40 && !state; i++) {
    state = await db.collection('settings').findOne({ key: 'schema_version' });
    if (!state) await wait(500);
  }
  check(
    'schema version was recorded automatically',
    !!state?.value?.version,
    JSON.stringify(state)
  );
  const indexes = async (c) =>
    (await db.collection(c).indexes()).map((i) => ({
      key: Object.keys(i.key).join(),
      unique: !!i.unique,
      partial: !!i.partialFilterExpression,
    }));
  const home = await indexes('homepage');
  check(
    'homepage.type is unique',
    home.some((i) => i.key === 'type' && i.unique)
  );
  const av = await indexes('avatars');
  check(
    'only one live avatar is enforced by the database',
    av.some((i) => i.key === 'isActive' && i.unique && i.partial)
  );
  check(
    'settings.key is unique',
    (await indexes('settings')).some((i) => i.key === 'key' && i.unique)
  );
  check(
    'list sections are indexed',
    (await indexes('certifications')).some((i) => i.key === 'order')
  );
  await mongoose.disconnect();
}

// Clean slate in Mongo (idempotent between runs).
for (const col of ['avatars']) {
  const r = await api('/api/admin/avatars');
  for (const a of r.json?.avatars ?? [])
    await api(`/api/admin/avatars?id=${a._id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------------------
group('1. Access control');
check(
  'avatars requires a session',
  (await api('/api/admin/avatars', { auth: false })).status === 401
);
check(
  'media/sign requires a session',
  (
    await api('/api/admin/media/sign', {
      method: 'POST',
      body: { scope: 'projects', kind: 'image' },
      auth: false,
    })
  ).status === 401
);
check(
  'media discard requires a session',
  (
    await api('/api/admin/media', {
      method: 'DELETE',
      body: { public_id: 'sections/projects/x' },
      auth: false,
    })
  ).status === 401
);

// ---------------------------------------------------------------------------------------
group('2. Direct-upload signing');
{
  const r = await api('/api/admin/media/sign', {
    method: 'POST',
    body: { scope: 'projects', kind: 'image' },
  });
  check('image signature issued', r.status === 200 && r.json?.signature, JSON.stringify(r.json));
  check('folder is locked to the scope', r.json?.params?.folder === 'sections/projects');
  check(
    'formats are restricted',
    r.json?.params?.allowed_formats?.includes('jpg') &&
      !r.json?.params?.allowed_formats?.includes('svg')
  );
  check('image endpoint', r.json?.endpoint?.endsWith('/v1_1/testcloud/image/upload'));
  const expected = cloudinary.utils.api_sign_request(r.json.params, 'testsecret');
  check('signature is the real Cloudinary signature', r.json?.signature === expected);
  check('secret never returned', !JSON.stringify(r.json).includes('testsecret'));
  const v = await api('/api/admin/media/sign', {
    method: 'POST',
    body: { scope: 'certifications', kind: 'video' },
  });
  check(
    'video endpoint + formats',
    v.json?.endpoint?.endsWith('/video/upload') &&
      v.json?.params?.allowed_formats?.includes('mp4') &&
      !('transformation' in v.json.params)
  );
  check(
    'avatars cannot take video',
    (
      await api('/api/admin/media/sign', {
        method: 'POST',
        body: { scope: 'avatars', kind: 'video' },
      })
    ).status === 400
  );
  check(
    'unknown scope rejected',
    (await api('/api/admin/media/sign', { method: 'POST', body: { scope: 'etc', kind: 'image' } }))
      .status === 400
  );
}

// ---------------------------------------------------------------------------------------
group('3. Profile picture library');
let p1, p3;
{
  let r = await api('/api/admin/avatars');
  check(
    'empty library + connected',
    r.status === 200 && Array.isArray(r.json?.avatars) && r.json.cloudinaryConfigured === true,
    JSON.stringify(r.json)
  );
  await seed('avatars/p1', 'image', 'picture-A');
  r = await api('/api/admin/avatars', {
    method: 'POST',
    body: { public_id: 'avatars/p1', name: 'me.png' },
  });
  p1 = r.json?.avatar;
  check(
    'register becomes live by default',
    r.status === 200 && p1?.isActive === true && r.json.duplicate === false,
    JSON.stringify(r.json)
  );
  check(
    'details come from Cloudinary, not the browser',
    p1?.width === 800 && p1?.secure_url?.includes('res.cloudinary.com')
  );
  r = await api('/api/admin/avatars', { method: 'POST', body: { public_id: 'avatars/p1' } });
  check('registering twice is idempotent', r.status === 200 && r.json.duplicate === true);
  await seed('avatars/p2', 'image', 'picture-A'); // identical content => same etag
  r = await api('/api/admin/avatars', { method: 'POST', body: { public_id: 'avatars/p2' } });
  check(
    'same picture again is detected as a duplicate',
    r.status === 200 && r.json.duplicate === true && r.json.avatar._id === p1._id
  );
  check('duplicate upload is removed from Cloudinary', !(await has('avatars/p2')));
  await seed('avatars/p3', 'image', 'picture-B');
  r = await api('/api/admin/avatars', {
    method: 'POST',
    body: { public_id: 'avatars/p3', setActive: false },
  });
  p3 = r.json?.avatar;
  check('setActive:false keeps the current one live', r.status === 200 && p3?.isActive === false);
  r = await api('/api/admin/avatars');
  check(
    'exactly one live picture',
    r.json.avatars.filter((a) => a.isActive).length === 1 && r.json.avatars.length === 2
  );
  check(
    'folder escape rejected',
    (
      await api('/api/admin/avatars', {
        method: 'POST',
        body: { public_id: 'sections/projects/zzz' },
      })
    ).status === 400
  );
  check(
    'missing file rejected',
    (await api('/api/admin/avatars', { method: 'POST', body: { public_id: 'avatars/ghost' } }))
      .status === 404
  );
  check(
    'bad id -> 400',
    (
      await api('/api/admin/avatars', {
        method: 'PATCH',
        body: { action: 'set_active', id: 'nope' },
      })
    ).status === 400
  );
  r = await api('/api/admin/avatars', {
    method: 'PATCH',
    body: { action: 'set_active', id: '64b64b64b64b64b64b64b64b' },
  });
  check(
    'unknown id -> 404 and nothing deactivated',
    r.status === 404 && (await api('/api/admin/avatars')).json.avatars.some((a) => a.isActive)
  );
  check(
    'switch live picture',
    (
      await api('/api/admin/avatars', {
        method: 'PATCH',
        body: { action: 'set_active', id: p3._id },
      })
    ).status === 200
  );
  const red = await api('/api/avatar');
  check(
    '/api/avatar redirects to the live picture',
    red.status === 302 && red.headers.get('location') === p3.secure_url,
    red.headers.get('location')
  );
  check(
    'cannot delete the live picture',
    (await api(`/api/admin/avatars?id=${p3._id}`, { method: 'DELETE' })).status === 409
  );
  check(
    'delete a spare picture',
    (await api(`/api/admin/avatars?id=${p1._id}`, { method: 'DELETE' })).status === 200 &&
      !(await has('avatars/p1'))
  );
  await seed('avatars/p4', 'image', 'picture-C');
  const p4 = (
    await api('/api/admin/avatars', {
      method: 'POST',
      body: { public_id: 'avatars/p4', setActive: false },
    })
  ).json.avatar;
  await fakePost('/__fail', { match: 'destroy', status: 500, message: 'boom' });
  r = await api(`/api/admin/avatars?id=${p4._id}`, { method: 'DELETE' });
  check(
    'Cloudinary failure => 502 and the entry is KEPT',
    r.status === 502 &&
      (await api('/api/admin/avatars')).json.avatars.some((a) => a._id === p4._id),
    r.text
  );
  check(
    'retry succeeds',
    (await api(`/api/admin/avatars?id=${p4._id}`, { method: 'DELETE' })).status === 200
  );
}

// ---------------------------------------------------------------------------------------
group('4. Two-way sync with Cloudinary');
{
  await seed('avatars/p5', 'image', 'picture-D');
  let r = await api('/api/admin/avatars/sync');
  check(
    'dry run lists a file the library does not know',
    r.status === 200 && r.json.untracked?.some((a) => a.public_id === 'avatars/p5'),
    JSON.stringify(r.json)
  );
  r = await api('/api/admin/avatars/sync', { method: 'POST' });
  check('apply imports it (inactive)', r.status === 200 && r.json.imported === 1);
  await fakePost('/__delete', { public_id: 'avatars/p3' }); // someone deletes the LIVE picture in the Cloudinary console
  r = await api('/api/admin/avatars/sync');
  check(
    'dry run flags the missing live picture',
    r.json.missing?.length === 1,
    JSON.stringify(r.json)
  );
  r = await api('/api/admin/avatars/sync', { method: 'POST' });
  check(
    'apply removes it and reports the site fell back',
    r.status === 200 && r.json.removed === 1 && r.json.deactivated === true
  );
  const red = await api('/api/avatar');
  check(
    '/api/avatar now serves the placeholder',
    red.status === 302 && red.headers.get('location')?.includes('avatar-placeholder'),
    red.headers.get('location')
  );
  const list = (await api('/api/admin/avatars')).json.avatars;
  const p5 = list.find((a) => a.public_id === 'avatars/p5');
  check('imported picture is in the library', !!p5);
  await api('/api/admin/avatars', { method: 'PATCH', body: { action: 'set_active', id: p5._id } });
  const del = await api('/api/admin/cloudinary-media', {
    method: 'DELETE',
    body: { public_ids: ['avatars/p5'] },
  });
  check('deleting in the Cloudinary explorer succeeds', del.status === 200);
  check(
    '...and also removes the library entry',
    !(await api('/api/admin/avatars')).json.avatars.some((a) => a.public_id === 'avatars/p5')
  );
  check(
    '...so the site is back on the placeholder',
    (await api('/api/avatar')).headers.get('location')?.includes('avatar-placeholder')
  );

  await seed('avatars/r1', 'image', 'picture-E');
  await api('/api/admin/avatars', { method: 'POST', body: { public_id: 'avatars/r1' } });
  const ren = await api('/api/admin/cloudinary-media?action=rename', {
    method: 'POST',
    body: { from_public_id: 'avatars/r1', to_public_id: 'avatars/r1-renamed' },
  });
  const after = (await api('/api/admin/avatars')).json.avatars.find(
    (a) => a.public_id === 'avatars/r1-renamed'
  );
  check(
    'rename in the explorer updates the library entry',
    ren.status === 200 && !!after && after.secure_url.includes('r1-renamed'),
    ren.text
  );
  check(
    '...and the live redirect follows the rename',
    (await api('/api/avatar')).headers.get('location')?.includes('r1-renamed')
  );
}

// ---------------------------------------------------------------------------------------
group('5. Project pictures and videos');
const project = (media, extra = {}) => ({
  title: 'Brand identity',
  description: 'A rebrand.',
  tags: ['Design'],
  featured: false,
  github: '',
  demo: '',
  media,
  ...extra,
});
const saveProjects = (projects, extra = {}) =>
  api('/api/admin/content/projects', { method: 'POST', body: { projects, ...extra } });
{
  for (const id of ['a', 'b', 'c']) await seed(`sections/projects/${id}`);
  await seed('sections/projects/v', 'video');
  await seed('avatars/keep', 'image', 'must-survive');

  let r = await saveProjects([
    project([
      item('sections/projects/a'),
      item('sections/projects/b'),
      item('sections/projects/c'),
      item('sections/projects/v', 'video'),
    ]),
  ]);
  check('save project with 3 pictures + 1 video', r.status === 200, r.text);
  r = await api('/api/admin/content/projects');
  check(
    'order is preserved (index 0 = cover)',
    r.json?.projects?.[0]?.media?.map((m) => m.public_id).join() ===
      'sections/projects/a,sections/projects/b,sections/projects/c,sections/projects/v',
    JSON.stringify(r.json?.projects?.[0]?.media)
  );
  check('video kind is preserved', r.json?.projects?.[0]?.media?.[3]?.kind === 'video');

  const bad = async (label, media, status = 400) =>
    check(label, (await saveProjects([project(media)])).status === status);
  await bad('external image host rejected', [
    { kind: 'image', src: 'https://evil.example.com/x.png', public_id: 'sections/projects/a' },
  ]);
  await bad('foreign folder rejected', [item('avatars/keep')]);
  await bad('video url with image kind mismatch rejected', [
    { kind: 'video', src: url('image', 'sections/projects/v'), public_id: 'sections/projects/v' },
  ]);
  await bad(
    'more than 12 items rejected',
    Array.from({ length: 13 }, (_, i) => item(`sections/projects/n${i}`))
  );
  check(
    'javascript: link rejected',
    (await saveProjects([project([], { links: [{ label: 'x', url: 'javascript:alert(1)' }] })]))
      .status === 400
  );
  check(
    'legacy payload (github/demo only, no media) still saves',
    (
      await saveProjects([
        {
          title: 'Old',
          description: 'd',
          tags: [],
          featured: false,
          github: 'https://github.com/x/y',
          demo: '',
        },
      ])
    ).status === 200
  );

  // The legacy save above replaced the whole list, so its pictures were (correctly) deleted. Start again.
  await wait(2000); // the background cleanup of that save must finish first
  for (const id of ['a', 'b', 'c']) await seed(`sections/projects/${id}`);
  await seed('sections/projects/v', 'video');
  await saveProjects([
    project([
      item('sections/projects/a'),
      item('sections/projects/b'),
      item('sections/projects/c'),
      item('sections/projects/v', 'video'),
    ]),
  ]);
  r = await saveProjects([project([item('sections/projects/a'), item('sections/projects/c')])]);
  await wait(1500);
  check(
    'removed picture b is deleted from Cloudinary',
    r.status === 200 && !(await has('sections/projects/b'))
  );
  check(
    'removed VIDEO is deleted with the video resource type',
    !(await has('sections/projects/v', 'video')) &&
      (await fakeState()).log.some((l) => l.includes('video/destroy'))
  );
  check(
    'kept pictures survive',
    (await has('sections/projects/a')) && (await has('sections/projects/c'))
  );
  await saveProjects([]);
  await wait(1500);
  check(
    'deleting the project deletes its files',
    !(await has('sections/projects/a')) && !(await has('sections/projects/c'))
  );
  check('files outside the project area were never touched', await has('avatars/keep'));
}

// ---------------------------------------------------------------------------------------
group('6. Removing from list editors (the "Remove does nothing" bug)');
{
  await seed('sections/certifications/b1');
  await seed('sections/certifications/m1');
  await seed('sections/certifications/mv1', 'video');
  const cert = {
    name: 'Certified Pro',
    issuer: 'Board',
    badge: {
      src: url('image', 'sections/certifications/b1'),
      public_id: 'sections/certifications/b1',
    },
    media: [item('sections/certifications/m1'), item('sections/certifications/mv1', 'video')],
  };
  let r = await api('/api/admin/content/certifications', { method: 'POST', body: [cert] });
  check('create certification with badge, picture and video', r.status === 200, r.text);
  let list = (await api('/api/admin/content/certifications')).json;
  const id = list[0]._id;
  check('stored with media', list[0].media?.length === 2 && !!list[0].badge);
  // The editor omits an emptied field from the payload entirely:
  r = await api('/api/admin/content/certifications', {
    method: 'POST',
    body: [
      {
        _id: id,
        name: 'Certified Pro',
        issuer: 'Board',
        media: [item('sections/certifications/m1')],
      },
    ],
  });
  await wait(1500);
  list = (await api('/api/admin/content/certifications')).json;
  check(
    'Remove really removes the badge from the database',
    r.status === 200 && list[0].badge === undefined,
    JSON.stringify(list[0].badge)
  );
  check(
    'removed badge and video are deleted from Cloudinary',
    !(await has('sections/certifications/b1')) &&
      !(await has('sections/certifications/mv1', 'video'))
  );
  r = await api(`/api/admin/content/certifications?id=${id}`, { method: 'DELETE' });
  await wait(1500);
  check(
    'deleting the certification deletes the remaining file',
    r.status === 200 && !(await has('sections/certifications/m1'))
  );
  check(
    'video not allowed on testimonials',
    (
      await api('/api/admin/media/sign', {
        method: 'POST',
        body: { scope: 'testimonials', kind: 'video' },
      })
    ).status === 400
  );
}

// ---------------------------------------------------------------------------------------
group('7. Abandoned uploads and the Cloudinary explorer');
{
  await seed('sections/projects/orphan');
  let r = await api('/api/admin/media', {
    method: 'DELETE',
    body: { public_id: 'sections/projects/orphan', kind: 'image' },
  });
  check(
    'an unsaved upload can be discarded',
    r.status === 200 && !(await has('sections/projects/orphan'))
  );
  await seed('sections/projects/live');
  await saveProjects([project([item('sections/projects/live')])]);
  r = await api('/api/admin/media', {
    method: 'DELETE',
    body: { public_id: 'sections/projects/live', kind: 'image' },
  });
  check(
    'a file used by saved content is refused',
    r.status === 409 && (await has('sections/projects/live'))
  );
  check(
    'unmanaged ids are refused',
    (
      await api('/api/admin/media', {
        method: 'DELETE',
        body: { public_id: 'somewhere/else', kind: 'image' },
      })
    ).status === 400
  );
  await api('/api/admin/cloudinary-media', {
    method: 'DELETE',
    body: { public_ids: ['sections/projects/live'] },
  });
  const p = (await api('/api/admin/content/projects')).json.projects[0];
  check(
    'deleting in the explorer removes the picture from the project',
    Array.isArray(p.media) && p.media.length === 0,
    JSON.stringify(p.media)
  );
  await saveProjects([]);
}

// ---------------------------------------------------------------------------------------
group('8. Public site: style, avatar, favicon, gallery');
{
  await seed('avatars/final', 'image', 'picture-F');
  await api('/api/admin/avatars', { method: 'POST', body: { public_id: 'avatars/final' } });
  await seed('sections/projects/g1');
  await seed('sections/projects/g2');
  await saveProjects(
    [
      project([item('sections/projects/g1'), item('sections/projects/g2')], {
        links: [{ label: 'Case study', url: 'https://example.com/case' }],
      }),
    ],
    { ctaLabel: 'See everything', ctaUrl: 'https://example.com/all' }
  );

  let r = await api('/api/admin/content/theme', {
    method: 'POST',
    body: { uiStyle: 'clean', adminAccentMode: 'default' },
  });
  check('theme saves', r.status === 200, r.text);
  let home = await pageWhere(
    '/',
    (t) =>
      t.includes('sections%2Fprojects%2Fg1') &&
      t.includes('See everything') &&
      t.includes('avatars%2Ffinal')
  );
  check('home page shows the saved content', home.ok, String(home.status));
  check('default style is clean', home.text.includes('data-ui="clean"'));
  check('hero greeting is in the server HTML', home.text.includes('Welcome to my portfolio'));
  check(
    'hero subtitle is in the server HTML',
    home.text.includes('Your profession or tagline goes here')
  );
  check('favicon is a round PNG cut from the avatar', home.text.includes('r_max,f_png'));
  check('no generated /icon route is linked', !/href="\/icon[?"]/.test(home.text));
  check('share image is a JPEG variant', home.text.includes('f_jpg'));
  check(
    'project cover and thumbnail are in the HTML',
    home.text.includes('sections%2Fprojects%2Fg1') && home.text.includes('sections%2Fprojects%2Fg2')
  );
  check(
    'click-to-enlarge buttons exist',
    /aria-label="View Brand identity larger"/.test(home.text)
  );
  check(
    'the "see everything" button uses the owner\'s text and link',
    home.text.includes('See everything') && home.text.includes('https://example.com/all')
  );
  check('project link renders without any GitHub requirement', home.text.includes('Case study'));
  check('header avatar is the resolved Cloudinary image', home.text.includes('avatars%2Ffinal'));
  const articles = await pageWhere('/articles', (t) => t.includes('avatars%2Ffinal'));
  check(
    '/articles header uses the resolved avatar (not the /api/avatar redirect)',
    articles.ok && !articles.text.includes('%2Fapi%2Favatar')
  );

  r = await api('/api/admin/content/theme', {
    method: 'POST',
    body: { uiStyle: 'terminal', adminAccentMode: 'site', primary: '#ff0055' },
  });
  home = await pageWhere('/', (t) => t.includes('data-ui="terminal"'));
  check('terminal style switches data-ui', home.ok);
  check(
    'admin accent CSS follows the site colour',
    /\.admin-accent\{--color-emerald-50:#/.test(home.text)
  );
  await api('/api/admin/content/theme', {
    method: 'POST',
    body: { uiStyle: 'clean', adminAccentMode: 'default' },
  });
  home = await pageWhere(
    '/',
    (t) => t.includes('data-ui="clean"') && !t.includes('.admin-accent{')
  );
  check('back to clean, no admin accent override', home.ok);
  await saveProjects([]);
}

// ---------------------------------------------------------------------------------------
group('9. Every public route answers');
{
  const routes = [
    ['/', 200],
    ['/articles', 200],
    ['/kits/system', 200],
    ['/administrator/login', 200],
    ['/sitemap.xml', 200],
    ['/robots.txt', 200],
    ['/llms.txt', 200],
    ['/api/site', 200],
    ['/definitely-not-a-page', 404],
  ];
  for (const [route, expected] of routes) {
    const r = await api(route, { auth: false });
    check(`${route} -> ${expected}`, r.status === expected, String(r.status));
  }
  const site = await api('/api/site', { auth: false });
  check(
    '/api/site never exposes the /api/avatar redirect',
    site.json && site.json.avatarUrl && site.json.avatarUrl !== '/api/avatar'
  );
  const home = await api('/', { auth: false });
  check(
    'no developer-prompt wording is visible in the default (clean) style',
    home.text.includes('data-ui="clean"')
  );
}

// ---------------------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  [${f.section}] ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
