import { isAdmin } from '../_lib/auth.js';
export async function onRequestGet({ request, env, params }) {
  const key = [].concat(params.key).join('/');
  const row = await env.DB.prepare('SELECT p.status FROM media m JOIN pages p ON p.id=m.page_id WHERE m.r2_key=?').bind(key).first();
  const published = row?.status === 'published';
  if (!row || (!published && !(await isAdmin(request, env)))) return new Response('Introuvable', { status: 404 });
  const ranged = request.headers.has('Range');
  const obj = await env.BUCKET.get(key, ranged ? { range: request.headers } : {});
  if (!obj) return new Response('Introuvable', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('ETag', obj.httpEtag);
  h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', published ? 'public, max-age=86400' : 'private, no-store');
  h.set('X-Content-Type-Options', 'nosniff');
  let status = 200;
  if (ranged && obj.range) {
    const r = obj.range, off = r.offset ?? obj.size - r.suffix, len = r.length ?? obj.size - off;
    h.set('Content-Range', `bytes ${off}-${off + len - 1}/${obj.size}`);
    h.set('Content-Length', String(len));
    status = 206;
  } else h.set('Content-Length', String(obj.size));
  return new Response(obj.body, { status, headers: h });
}
