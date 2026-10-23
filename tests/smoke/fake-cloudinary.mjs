// Minimal fake of the Cloudinary Admin/Upload API pieces this app uses. Test tooling only.
import http from 'node:http';
import crypto from 'node:crypto';

const port = Number(process.argv[2] || 4010);
const CLOUD = 'testcloud';
const KEY = 'testkey';
const SECRET = 'testsecret';

/** public_id (with resource type) -> asset */
const assets = new Map();
const log = [];
let failNext = null; // { match, status, message }

const keyOf = (type, id) => `${type}:${id}`;

function makeAsset(type, id, content = id, format = 'png') {
  const etag = crypto.createHash('md5').update(content).digest('hex');
  const version = Math.floor(Date.now() / 1000);
  return {
    public_id: id,
    resource_type: type,
    type: 'upload',
    format,
    version,
    width: 800,
    height: 600,
    bytes: content.length,
    etag,
    created_at: new Date().toISOString(),
    secure_url: `https://res.cloudinary.com/${CLOUD}/${type}/upload/v${version}/${id}.${format}`,
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const cloudErr = (res, status, message) => send(res, status, { error: { message } });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    const ctype = req.headers['content-type'] || '';
    const form = new URLSearchParams();
    if (ctype.startsWith('multipart/form-data')) {
      // Text fields only (the app never sends file bytes through this fake).
      const boundary = ctype.split('boundary=')[1];
      for (const part of raw.split('--' + boundary)) {
        const nm = /name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/.exec(part);
        if (nm) form.append(nm[1], nm[2]);
      }
    } else {
      for (const [k, v] of new URLSearchParams(raw)) form.append(k, v);
    }
    const q = url.searchParams;
    const path = url.pathname;

    // ---- control plane
    if (path === '/__seed' && req.method === 'POST') {
      const b = JSON.parse(raw);
      const type = b.kind || 'image';
      const a = makeAsset(
        type,
        b.public_id,
        b.content ?? b.public_id,
        b.format || (type === 'video' ? 'mp4' : 'png')
      );
      assets.set(keyOf(type, b.public_id), a);
      return send(res, 200, a);
    }
    if (path === '/__delete' && req.method === 'POST') {
      const b = JSON.parse(raw);
      return send(res, 200, { deleted: assets.delete(keyOf(b.kind || 'image', b.public_id)) });
    }
    if (path === '/__state') {
      return send(res, 200, {
        assets: [...assets.values()].map((a) => `${a.resource_type}:${a.public_id}`),
        log,
      });
    }
    if (path === '/__reset') {
      assets.clear();
      log.length = 0;
      failNext = null;
      return send(res, 200, { ok: true });
    }
    if (path === '/__fail' && req.method === 'POST') {
      failNext = JSON.parse(raw);
      return send(res, 200, { ok: true });
    }

    const m = /^\/v1_1\/([^/]+)\/(.*)$/.exec(path);
    if (!m) return cloudErr(res, 404, 'Not found');
    const [, cloud, rest] = m;
    log.push(`${req.method} ${rest}`);

    if (cloud !== CLOUD) return cloudErr(res, 401, 'Invalid cloud_name');
    const auth = req.headers.authorization || '';
    const expected = 'Basic ' + Buffer.from(`${KEY}:${SECRET}`).toString('base64');
    const isAdminApi = rest.startsWith('resources') || rest === 'ping';
    if (isAdminApi && auth !== expected) return cloudErr(res, 401, 'Invalid credentials');

    if (failNext && rest.includes(failNext.match)) {
      const f = failNext;
      failNext = null;
      return cloudErr(res, f.status || 500, f.message || 'injected failure');
    }

    if (rest === 'ping') return send(res, 200, { status: 'ok' });

    // GET resources/<type>/upload/<public_id>
    let r = /^resources\/(image|video)\/upload\/(.+)$/.exec(rest);
    if (r && req.method === 'GET') {
      const a = assets.get(keyOf(r[1], decodeURIComponent(r[2])));
      return a ? send(res, 200, a) : cloudErr(res, 404, `Resource not found - ${r[2]}`);
    }
    // GET resources/<type>/upload  (by ids or prefix)
    r = /^resources\/(image|video)\/upload$/.exec(rest);
    if (r && req.method === 'GET') {
      const ids = q.getAll('public_ids[]');
      const prefix = q.get('prefix');
      let list = [...assets.values()].filter((a) => a.resource_type === r[1]);
      if (ids.length) list = list.filter((a) => ids.includes(a.public_id));
      else if (prefix) list = list.filter((a) => a.public_id.startsWith(prefix));
      return send(res, 200, { resources: list });
    }
    // DELETE resources/<type>/upload  (bulk)
    if (r && req.method === 'DELETE') {
      const ids = form.getAll('public_ids[]').concat(q.getAll('public_ids[]'));
      const deleted = {};
      for (const id of ids) deleted[id] = assets.delete(keyOf(r[1], id)) ? 'deleted' : 'not_found';
      return send(res, 200, { deleted, partial: false });
    }
    // POST <type>/destroy
    r = /^(image|video)\/destroy$/.exec(rest);
    if (r && req.method === 'POST') {
      const id = form.get('public_id');
      return send(res, 200, { result: assets.delete(keyOf(r[1], id)) ? 'ok' : 'not found' });
    }
    // POST image/rename
    if (rest === 'image/rename' && req.method === 'POST') {
      const from = form.get('from_public_id');
      const to = form.get('to_public_id');
      const a = assets.get(keyOf('image', from));
      if (!a) return cloudErr(res, 404, 'Resource not found');
      assets.delete(keyOf('image', from));
      const moved = { ...a, public_id: to, secure_url: a.secure_url.replace(from, to) };
      assets.set(keyOf('image', to), moved);
      return send(res, 200, moved);
    }
    return cloudErr(res, 404, `Unhandled ${req.method} ${rest}`);
  })
  .listen(port, '127.0.0.1', () => console.log(`fake cloudinary on ${port}`));
