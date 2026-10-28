import { json } from '../../../_lib/auth.js';
import { clean } from '../../../_lib/pages.js';
const getMedia = (env, id) => env.DB.prepare('SELECT id,kind,r2_key,mime,size,position FROM media WHERE page_id=? ORDER BY position').bind(id).all();
export async function onRequestGet({ request, env, params }) {
  const page = await env.DB.prepare('SELECT * FROM pages WHERE id=?').bind(params.id).first();
  if (!page) return json({ error: 'Page introuvable.' }, 404);
  const { results } = await getMedia(env, params.id);
  return json({ page, url: `${new URL(request.url).origin}/p/${page.slug}`,
    media: results.map((m) => ({ ...m, url: `/media/${m.r2_key}` })) });
}
export async function onRequestPut({ request, env, params }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  const { data, error } = clean(b);
  if (error) return json({ error }, 400);
  const status = b.status === 'published' ? 'published' : 'draft';
  const r = await env.DB.prepare(`UPDATE pages SET client_name=?,title=?,intro=?,letter=?,music_url=?,theme=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(data.client_name, data.title, data.intro, data.letter, data.music_url, data.theme, status, params.id).run();
  if (!r.meta.changes) return json({ error: 'Page introuvable.' }, 404);
  if (Array.isArray(b.order) && b.order.length) {
    await env.DB.batch(b.order.slice(0, 100).map((mid, i) =>
      env.DB.prepare('UPDATE media SET position=? WHERE id=? AND page_id=?').bind(i, String(mid), params.id)));
  }
  return json({ ok: true, status });
}
export async function onRequestDelete({ env, params }) {
  const { results } = await getMedia(env, params.id);
  if (results.length) await env.BUCKET.delete(results.map((m) => m.r2_key));
  await env.DB.prepare('DELETE FROM pages WHERE id=?').bind(params.id).run();
  return json({ ok: true });
}
