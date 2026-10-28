import { json } from '../../../_lib/auth.js';
import { clean, rid } from '../../../_lib/pages.js';
export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams.get('q')?.trim() || '';
  const { results } = await env.DB.prepare(
    `SELECT p.id,p.slug,p.client_name,p.title,p.status,p.created_at,p.updated_at,
      (SELECT COUNT(*) FROM media m WHERE m.page_id=p.id) AS media_count,
      (SELECT r2_key FROM media m WHERE m.page_id=p.id AND m.kind='photo' ORDER BY position LIMIT 1) AS cover
     FROM pages p WHERE p.client_name LIKE ?1 OR p.title LIKE ?1 ORDER BY p.created_at DESC LIMIT 500`
  ).bind(`%${q}%`).all();
  return json({ pages: results });
}
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  const { data, error } = clean(b);
  if (error) return json({ error }, 400);
  const id = crypto.randomUUID(), slug = rid(10);
  await env.DB.prepare('INSERT INTO pages (id,slug,client_name,title,intro,letter,music_url,theme) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, slug, data.client_name, data.title, data.intro, data.letter, data.music_url, data.theme).run();
  return json({ id, slug, status: 'draft', url: `${new URL(request.url).origin}/p/${slug}` }, 201);
}
