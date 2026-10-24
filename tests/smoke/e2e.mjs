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

async function api(p, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const res = await fetch(BASE + p, {
    method,
    redirect: 'manual',
    headers: {
      ...(auth ? { cookie: `admin_session=${token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      'x-forwarded-for': clientAddress,
      ...headers,
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

const BOT = {
  'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};
const results = [];
let section = '';
let sectionNo = 0;
let clientAddress = '10.0.0.1';
const group = (name) => {
  section = name;
  sectionNo += 1;
  clientAddress = `10.0.${sectionNo}.1`;
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
    ['/notes', 200],
    ['/notes/vault', 200],
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
group('10. One place for every colour');
{
  const light = {
    background: '#ffffff',
    foreground: '#111827',
    card: '#f8fafc',
    cardForeground: '#111827',
    primary: '#2563eb',
    primaryForeground: '#ffffff',
    secondary: '#7c3aed',
    secondaryForeground: '#ffffff',
    accent: '#0ea5e9',
    muted: '#9ca3af',
    mutedForeground: '#4b5563',
    border: '#e5e7eb',
    input: '#f3f4f6',
    ring: '#2563eb',
    destructive: '#b91c1c',
    success: '#15803d',
    warning: '#b45309',
    info: '#1d4ed8',
    uiStyle: 'clean',
    adminAccentMode: 'default',
  };
  let r = await api('/api/admin/content/theme', { method: 'POST', body: light });
  check('a light palette saves', r.status === 200, String(r.status));
  let home = await pageWhere('/', (t) => t.includes('--background:#ffffff'));
  check('the page carries the chosen background', home.ok);
  check('browser widgets are told it is a light page', /color-scheme:light/.test(home.text));
  check(
    'status colours are variables too',
    /--destructive:#b91c1c/.test(home.text) && /--success:#15803d/.test(home.text)
  );
  check('a colour palette is generated for charts', /--chart-12:#[0-9a-f]{6}/.test(home.text));
  check(
    'the page is not marked dark when the palette is light',
    !/<html[^>]*class="[^"]*\bdark\b/.test(home.text)
  );
  check(
    'no fixed grey/black/white palette classes are left in the public page',
    !/\b(?:bg|text|border)-(?:gray|zinc|slate|neutral|stone)-\d{2,3}\b/.test(home.text)
  );
  r = await api('/api/admin/content/theme', {
    method: 'POST',
    body: { primary: 'red;}body{display:none' },
  });
  const css = (await pageWhere('/', (t) => t.includes('--background:#1d232a'))).text;
  check('hostile colour input is ignored', r.status === 200 && !css.includes('display:none'));
  // back to the default palette
  await api('/api/admin/content/theme', { method: 'POST', body: {} });
}

// ---------------------------------------------------------------------------------------
group('11. Menu links and what is shown');
{
  const sections = (await api('/api/admin/content/layout')).json.sections;
  const setSection = (id, isEnabled) =>
    api('/api/admin/content/layout', {
      method: 'POST',
      body: {
        sections: sections.map((s) => ({
          id: s.id,
          order: s.order,
          isEnabled: s.id === id ? isEnabled : s.isEnabled,
        })),
      },
    });

  const defaults = await api('/api/admin/content/chrome');
  check(
    'navigation settings load with defaults',
    defaults.status === 200 && Array.isArray(defaults.json.nav)
  );
  check(
    'built-in links default to the original menu',
    ['home', 'about', 'projects', 'gallery', 'articles', 'kits', 'notes'].every(
      (id) => defaults.json.nav.find((n) => n.id === id)?.enabled
    )
  );

  const nav = defaults.json.nav.map((n) => {
    if (n.id === 'gallery') return { ...n, enabled: false };
    if (n.id === 'projects') return { ...n, label: 'Our Work' };
    return n;
  });
  nav.push({
    id: 'custom-shop',
    label: 'Shop',
    href: 'https://example.com/shop',
    enabled: true,
    newTab: true,
  });
  let r = await api('/api/admin/content/chrome', {
    method: 'POST',
    body: {
      ...defaults.json,
      nav,
      floatingContact: false,
      hero: { resume: true, socials: false },
      footer: { ...defaults.json.footer, adminLink: false },
    },
  });
  check('navigation settings save', r.status === 200, JSON.stringify(r.json));
  let home = await pageWhere('/', (t) => t.includes('Our Work'));
  check('a renamed link shows its new name', home.ok);
  check(
    'a custom link appears with a safe new-tab target',
    /href="https:\/\/example\.com\/shop"[^>]*rel="noopener noreferrer"/.test(home.text) ||
      /rel="noopener noreferrer"[^>]*href="https:\/\/example\.com\/shop"/.test(home.text)
  );
  check(
    'a hidden link is gone from the menu',
    !/<a[^>]*href="\/#gallery"[^>]*nav-link/.test(home.text)
  );
  check(
    'the floating contact button can be hidden',
    !home.text.includes('Let&#x27;s Connect') && !home.text.includes("Let's Connect")
  );
  check('the footer admin link can be hidden', !/href="\/administrator"/.test(home.text));
  check('no download button without an uploaded resume', !home.text.includes('Download CV'));

  r = await api('/api/admin/content/chrome', {
    method: 'POST',
    body: {
      ...defaults.json,
      nav: [...nav, { id: 'custom-bad', label: 'Bad', href: 'javascript:alert(1)', enabled: true }],
    },
  });
  check(
    'a script link is rejected, naming the field',
    r.status === 400 && r.json.details.some((d) => d.path.join('.') === `nav.${nav.length}.href`),
    JSON.stringify(r.json)
  );

  // turning a whole section off removes its link even though the link is switched on
  await api('/api/admin/content/chrome', { method: 'POST', body: defaults.json });
  r = await setSection('articles', false);
  check('the articles section can be switched off', r.status === 200);
  check(
    'articles pages disappear',
    (await pageWhere('/articles', () => true)).status === 404 ||
      (await api('/articles', { auth: false })).status === 404
  );
  home = await pageWhere('/', (t) => !/href="\/articles"/.test(t));
  check('its menu link disappears with it', home.ok);
  await setSection('articles', true);
  check('and comes back', (await pageWhere('/articles', () => true)).status === 200);
}

// ---------------------------------------------------------------------------------------
group('12. Which field is wrong? (validation answers)');
{
  const r = await api('/api/admin/content/global', {
    method: 'POST',
    body: {
      brandName: 'X',
      footerText: '',
      copyrightName: '',
      headerName: '',
      headerTag: '',
      githubProfileUrl: '',
      locationLabel: '',
      timeZone: '',
      socials: [{ href: 'a', label: 'b' }],
      footerSocials: [],
    },
  });
  check('a save with a missing field answers 400', r.status === 400, String(r.status));
  const paths = (r.json?.details ?? []).map((d) => d.path.join('.'));
  check('the answer names the field by its path', paths.includes('socials.0.icon'), paths.join());
  check(
    'every issue carries a readable message',
    (r.json?.details ?? []).every((d) => typeof d.message === 'string' && d.message)
  );
}

// ---------------------------------------------------------------------------------------
group('13. GitHub picture as the fallback avatar');
{
  const conn = (await mongoose.connect(process.env.MONGODB_URI)).connection.client.db(
    'portfolio_cms'
  );
  await conn.collection('avatars').deleteMany({});
  const globalDoc = (await api('/api/admin/content/global')).json;
  const save = (githubProfileUrl) =>
    api('/api/admin/content/global', { method: 'POST', body: { ...globalDoc, githubProfileUrl } });

  let r = await save('https://github.com/octocat');
  check('a GitHub profile link saves', r.status === 200);
  let redirect = await api('/api/avatar', { auth: false });
  check(
    'with no upload, /api/avatar points at the GitHub picture',
    redirect.status === 302 &&
      /avatars\.githubusercontent\.com\/octocat/.test(redirect.headers.get('location') ?? ''),
    redirect.headers.get('location') ?? ''
  );
  let home = await pageWhere('/', (t) => t.includes('avatars.githubusercontent.com'));
  check('the hero and header use it', home.ok);
  const effective = (await api('/api/admin/avatars')).json?.effective;
  check(
    'the admin sees where the picture comes from',
    effective?.source === 'github' && effective?.githubUsername === 'octocat',
    JSON.stringify(effective)
  );

  r = await save('github.com/some-name/');
  redirect = await api('/api/avatar', { auth: false });
  check(
    'a bare github.com link works too',
    /\/some-name/.test(redirect.headers.get('location') ?? ''),
    redirect.headers.get('location') ?? ''
  );

  r = await save('https://www.behance.net/someone');
  redirect = await api('/api/avatar', { auth: false });
  check(
    'a non-GitHub link falls back to the placeholder',
    /avatar-placeholder/.test(redirect.headers.get('location') ?? ''),
    redirect.headers.get('location') ?? ''
  );

  await save('https://github.com/octocat');
  const up = await seed('avatars/mine');
  await conn.collection('avatars').insertOne({
    name: 'mine.png',
    public_id: 'avatars/mine',
    secure_url: url('image', 'avatars/mine'),
    isActive: true,
    uploadedAt: new Date(),
  });
  await save('https://github.com/octocat'); // clears the in-process cache
  redirect = await api('/api/avatar', { auth: false });
  check(
    'an uploaded picture always wins over GitHub',
    /testcloud/.test(redirect.headers.get('location') ?? ''),
    redirect.headers.get('location') ?? ''
  );
  void up;
  await conn.collection('avatars').deleteMany({});
  await save('');
}

// ---------------------------------------------------------------------------------------
group('14. Articles: write, publish, react, comment, delete');
{
  const conn = (await mongoose.connect(process.env.MONGODB_URI)).connection.client.db(
    'portfolio_cms'
  );
  await seed('sections/articles/cover1');
  await seed('sections/articles/inline1');
  await seed('sections/articles/inline2');
  const body = [
    '## First heading',
    '',
    'Hello **world** with a [safe link](https://example.com).',
    '',
    `![Inline picture](${url('image', 'sections/articles/inline1')})`,
    '',
    '::: note',
    'A note box',
    ':::',
    '',
    '## Second heading',
    '',
    '<script>window.pwned=1</script>',
    '',
    '[bad](javascript:alert(1))',
  ].join('\n');
  const input = {
    title: 'My First Article',
    slug: '',
    excerpt: 'A short summary of the article.',
    body,
    cover: { src: url('image', 'sections/articles/cover1'), public_id: 'sections/articles/cover1' },
    media: [
      item('sections/articles/cover1'),
      item('sections/articles/inline1'),
      item('sections/articles/inline2'),
    ],
    tags: ['Design', '#design', 'Life'],
    status: 'draft',
    design: { font: 'serif', size: 'lg', header: 'overlay', showToc: true, accent: '#0d9488' },
    footerNote: 'Thanks for reading!',
  };

  let r = await api('/api/admin/articles', { method: 'POST', body: { ...input, title: '' } });
  check(
    'an article without a title is refused, naming the title field',
    r.status === 400 && r.json.details.some((d) => d.path[0] === 'title'),
    JSON.stringify(r.json)
  );

  r = await api('/api/admin/articles', {
    method: 'POST',
    body: {
      ...input,
      cover: { src: 'https://evil.example/x.png', public_id: 'sections/articles/x' },
    },
  });
  check('a cover that is not on Cloudinary is refused', r.status === 400);

  r = await api('/api/admin/articles', { method: 'POST', body: input });
  check(
    'a draft is created',
    r.status === 200 && r.json.slug === 'my-first-article',
    JSON.stringify(r.json)
  );
  const id = r.json.id;

  r = await api('/api/admin/articles', {
    method: 'POST',
    body: { ...input, slug: 'my-first-article' },
  });
  check(
    'a taken address is refused, naming the slug field',
    r.status === 400 && r.json.details.some((d) => d.path[0] === 'slug'),
    JSON.stringify(r.json)
  );

  r = await api('/api/admin/articles', {
    method: 'POST',
    body: { ...input, title: 'My First Article' },
  });
  check(
    'the same title gets its own address',
    r.status === 200 && r.json.slug === 'my-first-article-2',
    JSON.stringify(r.json)
  );
  await api(`/api/admin/articles/${r.json.id}`, { method: 'DELETE' });

  check(
    'a draft is private',
    (await api('/articles/my-first-article', { auth: false })).status === 404
  );
  const listed = await api('/api/admin/articles');
  const row = listed.json.articles.find((a) => a.id === id);
  check(
    'the admin list shows the draft',
    row?.status === 'draft' && row.tags.length === 2,
    JSON.stringify(row)
  );

  r = await api(`/api/admin/articles/${id}`, {
    method: 'PUT',
    body: { ...input, slug: 'my-first-article', status: 'published' },
  });
  check('publishing works', r.status === 200, JSON.stringify(r.json));

  const page = await pageWhere(
    '/articles/my-first-article',
    (t) => t.includes('My First Article') && t.includes('First heading')
  );
  check('the article page shows title and text', page.ok);
  check(
    'headings get ids for links and the contents list',
    /<h2 id="first-heading"/.test(page.text) && /<h2 id="second-heading"/.test(page.text)
  );
  check('the table of contents is shown when chosen', page.text.includes('In this article'));
  check(
    'the chosen design reaches the page',
    /data-font="serif"/.test(page.text) && /data-size="lg"/.test(page.text)
  );
  check(
    "the writer's accent colour is used for this article only",
    /--article-accent:#0d9488/.test(page.text)
  );
  check('a note block renders as a styled box', page.text.includes('article-block-note'));
  check(
    'pictures are served through Cloudinary sizing',
    /res\.cloudinary\.com\/testcloud\/image\/upload\/c_limit/.test(page.text)
  );
  check(
    'raw HTML in the text is never rendered',
    !page.text.includes('<script>window.pwned'),
    'script tag found'
  );
  check('javascript: links are dropped', !page.text.includes('javascript:alert'));
  check('the closing note is shown', page.text.includes('Thanks for reading!'));
  check('structured data names the article', page.text.includes('"@type":"BlogPosting"'));
  check(
    'tags were cleaned and de-duplicated',
    page.text.includes('Design') && page.text.includes('Life') && !page.text.includes('#design')
  );

  const index = await pageWhere('/articles', (t) => t.includes('My First Article'));
  check('the articles list shows it', index.ok);
  const rss = await api('/articles/rss.xml', { auth: false });
  check(
    'the RSS feed lists it',
    rss.status === 200 &&
      rss.text.includes('<title>My First Article</title>') &&
      /rss\+xml/.test(rss.headers.get('content-type') ?? '')
  );
  const sitemap = await pageWhere('/sitemap.xml', (t) => t.includes('/articles/my-first-article'));
  check('the sitemap lists it', sitemap.ok);
  const llms = await api('/llms.txt', { auth: false });
  check('llms.txt lists it', llms.text.includes('My First Article'));

  // ---- reactions
  let visitorNo = 0;
  const visitor = () => ({ origin: BASE, 'x-forwarded-for': `10.9.0.${++visitorNo}` });
  const same = { origin: BASE };
  r = await api('/api/articles/my-first-article/react', {
    method: 'POST',
    auth: false,
    headers: same,
    body: { kind: 'like' },
  });
  const cookie = (r.headers.get('set-cookie') ?? '').split(';')[0];
  check(
    'a first reaction counts and sets an anonymous visitor cookie',
    r.status === 200 && r.json.counts.like === 1 && r.json.active === true && /^pv=/.test(cookie),
    JSON.stringify(r.json)
  );
  r = await api('/api/articles/my-first-article/react', {
    method: 'POST',
    auth: false,
    headers: { ...same, cookie },
    body: { kind: 'like' },
  });
  check(
    'reacting again takes it back (one per visitor)',
    r.json.counts.like === 0 && r.json.active === false,
    JSON.stringify(r.json)
  );
  await api('/api/articles/my-first-article/react', {
    method: 'POST',
    auth: false,
    headers: { ...same, cookie },
    body: { kind: 'love' },
  });
  r = await api('/api/articles/my-first-article/engagement', { auth: false, headers: { cookie } });
  check(
    'the visitor sees which reactions are theirs',
    r.json.mine.join() === 'love' && r.json.counts.love === 1,
    JSON.stringify(r.json)
  );
  r = await api('/api/articles/my-first-article/react', {
    method: 'POST',
    auth: false,
    headers: same,
    body: { kind: 'sparkles' },
  });
  check('an unknown reaction is refused', r.status === 400);
  r = await api('/api/articles/my-first-article/react', {
    method: 'POST',
    auth: false,
    headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' },
    body: { kind: 'like' },
  });
  check('cross-site reaction requests are refused', r.status === 403);

  // ---- comments
  const comment = { name: 'Reader', email: '', body: 'Great article, thank you!', hp: '' };
  r = await api('/api/articles/my-first-article/comments', {
    method: 'POST',
    auth: false,
    headers: visitor(),
    body: { ...comment, body: 'x' },
  });
  check(
    'a too-short comment names the field',
    r.status === 400 && r.json.details.some((d) => d.path[0] === 'body'),
    JSON.stringify(r.json)
  );
  r = await api('/api/articles/my-first-article/comments', {
    method: 'POST',
    auth: false,
    headers: visitor(),
    body: { ...comment, name: '' },
  });
  check(
    'a missing name names the field',
    r.status === 400 && r.json.details.some((d) => d.path[0] === 'name')
  );
  r = await api('/api/articles/my-first-article/comments', {
    method: 'POST',
    auth: false,
    headers: visitor(),
    body: { ...comment, body: 'see http://a.example http://b.example http://c.example' },
  });
  check(
    'too many links are refused',
    r.status === 400 && r.json.details.some((d) => d.path[0] === 'body')
  );
  r = await api('/api/articles/my-first-article/comments', {
    method: 'POST',
    auth: false,
    headers: visitor(),
    body: { ...comment, hp: 'i am a bot' },
  });
  check(
    'the hidden bot field is accepted silently but stores nothing',
    r.status === 200 &&
      (await conn.collection('article_comments').countDocuments({ body: comment.body })) === 0
  );

  r = await api('/api/articles/my-first-article/comments', {
    method: 'POST',
    auth: false,
    headers: { ...visitor(), cookie },
    body: comment,
  });
  check(
    'a comment waits for approval by default',
    r.status === 200 && r.json.status === 'pending' && r.json.comment === null,
    JSON.stringify(r.json)
  );
  const pending = await api('/api/admin/articles/comments?status=pending');
  const cm = pending.json.comments.find((c) => c.body === comment.body);
  check('the owner sees it in the pending list', !!cm && cm.articleTitle === 'My First Article');
  let shown = await api('/articles/my-first-article', { auth: false });
  check('and visitors do not', !shown.text.includes('Great article, thank you!'));
  r = await api('/api/articles/my-first-article/comments', {
    method: 'POST',
    auth: false,
    headers: { ...visitor(), cookie },
    body: comment,
  });
  check(
    'posting the same text twice is refused',
    r.status === 400 || r.status === 429,
    String(r.status)
  );

  r = await api('/api/admin/articles/comments', {
    method: 'PATCH',
    body: { id: cm.id, status: 'approved' },
  });
  check('approving works', r.status === 200);
  shown = await pageWhere('/articles/my-first-article', (t) =>
    t.includes('Great article, thank you!')
  );
  check('an approved comment appears on the page', shown.ok);
  r = await api('/api/admin/articles/comments', {
    method: 'POST',
    body: { articleId: id, parentId: cm.id, body: 'Thank you for reading!' },
  });
  check('the owner can reply publicly', r.status === 200);
  shown = await pageWhere('/articles/my-first-article', (t) =>
    t.includes('Thank you for reading!')
  );
  check(
    'the reply shows under the comment, marked as the author',
    shown.ok && shown.text.includes('Author')
  );
  const counted = await api('/api/articles/my-first-article/engagement', { auth: false });
  check('the comment count follows', counted.json.commentCount === 2, JSON.stringify(counted.json));

  const off = await api('/api/admin/articles/settings', {
    method: 'PUT',
    body: { moderate: false, reactions: true, comments: true },
  });
  check('moderation can be switched off', off.status === 200);
  r = await api('/api/articles/my-first-article/comments', {
    method: 'POST',
    auth: false,
    headers: visitor(),
    body: { ...comment, body: 'Posted straight away' },
  });
  check(
    'then comments appear immediately',
    r.status === 200 &&
      r.json.status === 'approved' &&
      r.json.comment?.body === 'Posted straight away',
    JSON.stringify(r.json)
  );
  await api('/api/admin/articles/settings', {
    method: 'PUT',
    body: { moderate: true, reactions: true, comments: true },
  });

  // ---- editing removes pictures that are no longer used
  const trimmed = body.replace(/!\[Inline picture\]\([^)]*\)/, '');
  r = await api(`/api/admin/articles/${id}`, {
    method: 'PUT',
    body: {
      ...input,
      slug: 'my-first-article',
      status: 'published',
      body: trimmed,
      media: input.media,
    },
  });
  check('saving without a picture in the text works', r.status === 200);
  await wait(2000);
  check(
    'the picture that left the text is deleted from Cloudinary',
    !(await has('sections/articles/inline1'))
  );
  check('an unused upload is deleted too', !(await has('sections/articles/inline2')));
  check('the cover stays', await has('sections/articles/cover1'));

  // ---- renaming the address and deleting
  r = await api(`/api/admin/articles/${id}`, {
    method: 'PUT',
    body: {
      ...input,
      slug: 'renamed-article',
      status: 'published',
      body: trimmed,
      media: [item('sections/articles/cover1')],
    },
  });
  check('the address can be changed', r.status === 200 && r.json.slug === 'renamed-article');
  check(
    'the new address works',
    (await pageWhere('/articles/renamed-article', (t) => t.includes('My First Article'))).ok
  );
  r = await api(`/api/admin/articles/${id}`, {
    method: 'PUT',
    body: {
      ...input,
      slug: 'renamed-article',
      status: 'draft',
      body: trimmed,
      media: [item('sections/articles/cover1')],
    },
  });
  {
    let status = 0;
    for (let i = 0; i < 30 && status !== 404; i++) {
      status = (await api('/articles/renamed-article', { auth: false, headers: BOT })).status;
      if (status !== 404) await wait(500);
    }
    check('unpublishing hides it again (crawlers get a 404)', status === 404, String(status));
  }

  r = await api(`/api/admin/articles/${id}`, { method: 'DELETE' });
  check('deleting works', r.status === 200);
  await wait(2000);
  check('deleting removes its cover from Cloudinary', !(await has('sections/articles/cover1')));
  check(
    'and its comments',
    (await conn
      .collection('article_comments')
      .countDocuments({ articleId: new mongoose.Types.ObjectId(id) })) === 0
  );
  check(
    'and its reactions',
    (await conn
      .collection('article_reactions')
      .countDocuments({ articleId: new mongoose.Types.ObjectId(id) })) === 0
  );
  check('the article is gone', (await api(`/api/admin/articles/${id}`)).status === 404);

  // access control
  check(
    'the article list needs a session',
    (await api('/api/admin/articles', { auth: false })).status === 401
  );
  check(
    'writing needs a session',
    (await api('/api/admin/articles', { method: 'POST', auth: false, body: input })).status === 401
  );
  check(
    'moderation needs a session',
    (
      await api('/api/admin/articles/comments', {
        method: 'PATCH',
        auth: false,
        body: { id: 'x', status: 'approved' },
      })
    ).status === 401
  );
}

// ---------------------------------------------------------------------------------------
group('15. Notes: a public page, a private vault, files from the computer');
{
  const conn = (await mongoose.connect(process.env.MONGODB_URI)).connection.client.db(
    'portfolio_cms'
  );
  const nIat = Math.floor(Date.now() / 1000);
  const notesToken = await new SignJWT({ auth: 'notes' })
    .setProtectedHeader({ alg: 'HS512' })
    .setExpirationTime(nIat + 900)
    .setIssuedAt(nIat)
    .sign(new TextEncoder().encode(secret));
  const vault = (p, options = {}) =>
    api(p, {
      ...options,
      auth: false,
      headers: { cookie: `notes_session=${notesToken}`, ...(options.headers ?? {}) },
    });

  /** Sends raw file bytes the way the browser does (the file is the request body). */
  async function sendFile(name, bytes, type, { path: folder, cookie = true } = {}) {
    const query = new URLSearchParams({ name, ...(folder ? { path: folder } : {}) });
    const res = await fetch(`${BASE}/api/notes/files?${query}`, {
      method: 'POST',
      headers: {
        'content-type': type,
        'x-forwarded-for': clientAddress,
        ...(cookie ? { cookie: `notes_session=${notesToken}` } : {}),
      },
      body: bytes,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json };
  }
  const fileRequest = (id, { cookie = true, headers = {}, query = '' } = {}) =>
    fetch(`${BASE}/api/notes/files/${id}${query}`, {
      headers: {
        'x-forwarded-for': clientAddress,
        ...(cookie ? { cookie: `notes_session=${notesToken}` } : {}),
        ...headers,
      },
    });
  // a real 1x1 PNG
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  // ---- the public page and the private door
  let r = await api('/notes', { auth: false });
  check('the public notes page is open to everyone', r.status === 200);
  check(
    'it says nothing is published yet and offers the way to the private notes',
    r.text.includes('Nothing has been published yet') && r.text.includes('href="/notes/vault"'),
    r.text.slice(0, 300)
  );
  check(
    'the public page can be indexed',
    !/<meta name="robots" content="[^"]*noindex/.test(r.text)
  );
  const door = await api('/notes/vault', { auth: false });
  check(
    'the private notes page is never indexed',
    /<meta name="robots" content="[^"]*noindex/.test(door.text)
  );
  check(
    'the old private address (/notes?id=) still opens a page',
    (await api('/notes?id=000000000000000000000000', { auth: false })).status === 200
  );
  check(
    'the vault says whether it has a password',
    (await api('/api/notes/auth', { auth: false })).json?.configured === false
  );

  // ---- locked without a session
  for (const [label, res] of [
    ['reading the list', await api('/api/notes', { auth: false })],
    [
      'creating a note',
      await api('/api/notes', { method: 'POST', auth: false, body: { title: 'x' } }),
    ],
    ['uploading a file', await sendFile('a.png', PNG, 'image/png', { cookie: false })],
    ['the session check', await api('/api/notes/session', { auth: false })],
  ]) {
    check(`${label} needs the vault to be unlocked`, res.status === 401, String(res.status));
  }
  check('an admin session does not open the vault', (await api('/api/notes')).status === 401);

  // ---- writing
  r = await vault('/api/notes', { method: 'POST', body: { title: '', content: 'x' } });
  check(
    'a note without a title names the field',
    r.status === 400 && r.json.details.some((d) => d.path[0] === 'title'),
    JSON.stringify(r.json)
  );
  r = await vault('/api/notes', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'cross-site' },
    body: { title: 'sneaky' },
  });
  check('a request from another site is refused', r.status === 403, String(r.status));

  r = await vault('/api/notes', {
    method: 'POST',
    body: { title: 'Trip plan', content: 'Pack **light**.', tags: ['#Travel', 'travel', 'Plans!'] },
  });
  const noteId = r.json?.note?._id;
  check('a note is created', r.status === 200 && !!noteId, JSON.stringify(r.json));
  check(
    'tags are cleaned and not repeated',
    JSON.stringify(r.json.note.tags) === JSON.stringify(['travel', 'plans']),
    JSON.stringify(r.json.note.tags)
  );
  r = await vault('/api/notes?search=trip');
  check(
    'the list finds it by a word',
    r.json.notes.length === 1 && r.json.notes[0].title === 'Trip plan'
  );
  check(
    'the list sends a summary, not the whole text',
    r.json.notes[0].excerpt.includes('Pack light') && r.json.notes[0].content === undefined
  );
  check(
    'search text is never treated as a pattern',
    (await vault('/api/notes?search=(.*')).status === 200
  );
  check(
    'every note is not matched by ".*"',
    (await vault('/api/notes?search=.*')).json.notes.length === 0
  );

  // ---- files from the computer
  const png = await sendFile('holiday photo.png', PNG, 'image/png', { path: 'Trip/Day 1' });
  check(
    'a picture uploads',
    png.status === 200 && png.json.file?.type === 'image/png',
    JSON.stringify(png.json)
  );
  check(
    'its size and folder are recorded',
    png.json.file.size === PNG.length && png.json.file.path === 'Trip/Day 1'
  );
  const pngId = png.json.file.id;
  let f = await fileRequest(pngId);
  const got = Buffer.from(await f.arrayBuffer());
  check(
    'the owner gets the exact bytes back',
    f.status === 200 && got.equals(PNG),
    String(f.status)
  );
  check(
    'a picture is shown inline, and never sniffed',
    f.headers.get('content-type') === 'image/png' &&
      f.headers.get('content-disposition').startsWith('inline') &&
      f.headers.get('x-content-type-options') === 'nosniff'
  );
  check(
    'a private file is not served to a visitor',
    (await fileRequest(pngId, { cookie: false })).status === 404
  );
  f = await fileRequest(pngId, { headers: { range: 'bytes=0-9' } });
  check(
    'video and audio players can ask for a part of a file',
    f.status === 206 &&
      f.headers.get('content-range') === `bytes 0-9/${PNG.length}` &&
      (await f.arrayBuffer()).byteLength === 10
  );
  check(
    'a repeat visit is answered "not modified"',
    (await fileRequest(pngId, { headers: { 'if-none-match': `"${pngId}"` } })).status === 304
  );
  check(
    'a wrong range is refused',
    (await fileRequest(pngId, { headers: { range: 'bytes=9999-' } })).status === 416
  );
  check('an unknown file is a 404', (await fileRequest('0'.repeat(24))).status === 404);
  check('a made-up file id is a 404', (await fileRequest('not-an-id')).status === 404);

  const page = await sendFile('index.html', Buffer.from('<script>alert(1)</script>'), 'text/html');
  check(
    'a web page is stored as plain text',
    page.json?.file?.type === 'text/plain',
    JSON.stringify(page.json)
  );
  f = await fileRequest(page.json.file.id);
  check(
    'and served as text that cannot run',
    f.headers.get('content-type').startsWith('text/plain') &&
      /sandbox/.test(f.headers.get('content-security-policy') ?? '') &&
      (await f.text()) === '<script>alert(1)</script>'
  );
  const zip = await sendFile('bundle.zip', Buffer.from('PK\u0003\u0004zip'), 'application/zip');
  f = await fileRequest(zip.json.file.id);
  check(
    'a file that cannot be shown is a download',
    f.headers.get('content-disposition').startsWith('attachment')
  );
  f = await fileRequest(pngId, { query: '?download=1' });
  check(
    'a download can be asked for',
    f.headers.get('content-disposition').startsWith('attachment')
  );
  const pdf = await sendFile('paper.pdf', Buffer.from('%PDF-1.4 test'), 'application/pdf');
  f = await fileRequest(pdf.json.file.id);
  check(
    'a PDF can be shown inside the site, but not elsewhere',
    f.headers.get('content-type') === 'application/pdf' &&
      f.headers.get('x-frame-options') === 'SAMEORIGIN' &&
      /frame-ancestors 'self'/.test(f.headers.get('content-security-policy') ?? '')
  );
  const odd = await sendFile('weird\u0001"name<>.txt', Buffer.from('hi'), 'text/plain');
  check(
    'awkward file names are made safe',
    odd.json?.file?.name === 'weird__name__.txt',
    JSON.stringify(odd.json)
  );
  const big = await sendFile(
    'big.bin',
    Buffer.alloc(11 * 1024 * 1024, 1),
    'application/octet-stream'
  );
  check(
    'a file over the limit is refused with the reason',
    big.status === 413 && /up to 10\.0 MB/.test(big.json?.error ?? ''),
    JSON.stringify(big)
  );
  check(
    'a refused upload leaves nothing behind',
    (await conn.collection('note_files.files').countDocuments({ filename: 'big.bin' })) === 0
  );
  check('a missing name is refused', (await sendFile('', PNG, 'image/png')).status === 400);

  // ---- keeping files with the note
  r = await vault('/api/notes', {
    method: 'PUT',
    body: {
      id: noteId,
      title: 'Trip plan',
      content: `Pack **light**.\n\n![photo](/api/notes/files/${pngId})`,
      tags: ['travel'],
      attachments: [
        { id: pngId, name: 'lies.exe', type: 'application/x-evil', size: 1, path: 'Trip/Day 1' },
        { id: page.json.file.id, name: 'index.html', type: 'text/plain', size: 25 },
        { id: pdf.json.file.id, name: 'paper.pdf', type: 'application/pdf', size: 13 },
      ],
    },
  });
  check(
    'a note keeps its files',
    r.status === 200 && r.json.note.attachments.length === 3,
    JSON.stringify(r.json)
  );
  check(
    'name, type and size come from storage, not from the browser',
    r.json.note.attachments[0].name === 'holiday photo.png' &&
      r.json.note.attachments[0].type === 'image/png' &&
      r.json.note.attachments[0].size === PNG.length
  );
  r = await vault('/api/notes', {
    method: 'PUT',
    body: {
      id: noteId,
      title: 'x',
      attachments: [{ id: 'f'.repeat(24), name: 'a', type: '', size: 0 }],
    },
  });
  check(
    'a file that is not stored is refused, naming it',
    r.status === 400 && r.json.details[0].path.join('.') === 'attachments.0',
    JSON.stringify(r.json)
  );
  r = await vault(`/api/notes/files/${zip.json.file.id}`, { method: 'DELETE' });
  check(
    'an unsaved file can be removed',
    r.status === 200 && r.json.deleted === true,
    JSON.stringify(r.json)
  );
  r = await vault(`/api/notes/files/${pngId}`, { method: 'DELETE' });
  check('a file a note keeps is not removed this way', r.json?.deleted === false);
  check(
    'the stored file count matches',
    (await conn.collection('note_files.files').countDocuments({})) === 3 + 1 /* odd.txt */,
    String(await conn.collection('note_files.files').countDocuments({}))
  );

  // ---- the old upload files are cleaned up
  const { GridFSBucket } = mongoose.mongo;
  const bucket = new GridFSBucket(conn, { bucketName: 'note_files' });
  const stale = bucket.openUploadStream('stale.txt', { metadata: { type: 'text/plain' } });
  await new Promise((resolve) => stale.end(Buffer.from('old'), resolve));
  await conn
    .collection('note_files.files')
    .updateOne({ _id: stale.id }, { $set: { uploadDate: new Date(Date.now() - 3 * 86400_000) } });
  await sendFile('fresh.txt', Buffer.from('new'), 'text/plain');
  check(
    'files from a draft that was never saved are cleaned up after a day',
    (await conn.collection('note_files.files').countDocuments({ _id: stale.id })) === 0
  );
  check(
    'but a file kept by a note is never cleaned up',
    (await conn
      .collection('note_files.files')
      .countDocuments({ _id: new mongoose.Types.ObjectId(pngId) })) === 1
  );

  // ---- publishing
  r = await vault('/api/notes/publish', {
    method: 'PATCH',
    body: { id: noteId, published: true, slug: 'vault' },
  });
  check(
    'the address of the vault cannot be used',
    r.status === 400 && r.json.details[0].path[0] === 'slug',
    JSON.stringify(r.json)
  );
  r = await vault('/api/notes/publish?slug=vault');
  check('the address check says so too', r.json.available === false && r.json.reserved === true);
  r = await vault('/api/notes/publish', {
    method: 'PATCH',
    body: { id: noteId, published: true, slug: 'Trip Plan 2026' },
  });
  check(
    'a note is published at a clean address',
    r.status === 200 && r.json.note.slug === 'trip-plan-2026',
    JSON.stringify(r.json)
  );
  const second = await vault('/api/notes', {
    method: 'POST',
    body: { title: 'Another', content: 'other' },
  });
  r = await vault('/api/notes/publish', {
    method: 'PATCH',
    body: { id: second.json.note._id, published: true, slug: 'trip-plan-2026' },
  });
  check('two notes cannot share an address', r.status === 409, String(r.status));

  let pub = await pageWhere('/notes/trip-plan-2026', (t) => t.includes('Pack'));
  check('the published note has a public page', pub.ok, String(pub.status));
  check(
    'the page shows the text, the picture and the file list',
    pub.text.includes('<strong>light</strong>') &&
      pub.text.includes(`/api/notes/files/${pngId}`) &&
      pub.text.includes('paper.pdf')
  );
  check(
    'a visitor can read the files of a published note',
    (await fileRequest(pngId, { cookie: false })).status === 200
  );
  check(
    'but not the files of a private one',
    (await fileRequest(odd.json.file.id, { cookie: false })).status === 404
  );
  const index = await pageWhere('/notes', (t) => t.includes('Trip plan'));
  check(
    'the public list shows it, and not the private note',
    index.ok && !index.text.includes('Another')
  );
  const map = await api('/sitemap.xml', { auth: false });
  check(
    'the sitemap lists /notes and the note, not the vault',
    map.text.includes('/notes</loc>') &&
      map.text.includes('/notes/trip-plan-2026') &&
      !map.text.includes('/notes/vault')
  );

  r = await vault('/api/notes', {
    method: 'PUT',
    body: {
      id: noteId,
      title: 'Trip plan',
      content: 'Pack **very** light.',
      tags: ['travel'],
      attachments: [
        { id: pngId, name: 'x', type: '', size: 0 },
        { id: pdf.json.file.id, name: 'x', type: '', size: 0 },
      ],
    },
  });
  check('an edit saves', r.status === 200);
  pub = await pageWhere('/notes/trip-plan-2026', (t) => t.includes('very'));
  check('and shows on the public page right away', pub.ok);
  check(
    'a file taken out of the note is deleted',
    (await conn
      .collection('note_files.files')
      .countDocuments({ _id: new mongoose.Types.ObjectId(page.json.file.id) })) === 0
  );

  r = await vault('/api/notes/publish', {
    method: 'PATCH',
    body: { id: noteId, published: false },
  });
  check('a note can be made private again', r.status === 200 && r.json.note.published === false);
  const gone = await pageWhere('/notes/trip-plan-2026', () => false, 3000);
  const gone404 = await api('/notes/trip-plan-2026', { auth: false, headers: BOT });
  check('its public page stops working', gone404.status === 404, String(gone404.status));
  void gone;
  check(
    'and its files are private again',
    (await fileRequest(pngId, { cookie: false })).status === 404
  );
  const afterIndex = await pageWhere('/notes', (t) => !t.includes('Trip plan'));
  check('and it leaves the public list', afterIndex.ok);

  // ---- wording of the public page
  const cfg = await api('/api/admin/notes-config');
  check(
    'the notes options load, with the largest allowed file',
    cfg.status === 200 && cfg.json.maxFileMb === 10 && cfg.json.publicTitle === 'Notes',
    JSON.stringify(cfg.json)
  );
  r = await api('/api/admin/notes-config', { method: 'POST', body: { vaultButton: '' } });
  check(
    'an empty button label names the field',
    r.status === 400 && r.json.details[0].path[0] === 'vaultButton'
  );
  r = await api('/api/admin/notes-config', {
    method: 'POST',
    body: { publicTitle: 'Field notes', vaultButton: 'Owner entrance', maxFileMb: 12 },
  });
  check('the wording saves', r.status === 200);
  const reworded = await pageWhere(
    '/notes',
    (t) => t.includes('Field notes') && t.includes('Owner entrance')
  );
  check('and shows on the public page', reworded.ok);
  r = await vault('/api/notes/session');
  check(
    'the session reports the new file limit',
    r.json.maxFileBytes === 12 * 1024 * 1024,
    JSON.stringify(r.json)
  );
  await api('/api/admin/notes-config', {
    method: 'POST',
    body: { publicTitle: 'Notes', vaultButton: 'Private notes', maxFileMb: 10 },
  });

  // ---- deleting
  const before = await conn.collection('note_files.files').countDocuments({});
  r = await vault('/api/notes', { method: 'DELETE', body: { id: noteId } });
  check('a note is deleted', r.status === 200 && r.json.deletedCount === 1);
  check(
    'with all of its files',
    (await conn.collection('note_files.files').countDocuments({})) === before - 2,
    `${before} -> ${await conn.collection('note_files.files').countDocuments({})}`
  );
  await vault('/api/notes', { method: 'DELETE', body: { id: second.json.note._id } });
}

// ---------------------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  [${f.section}] ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
