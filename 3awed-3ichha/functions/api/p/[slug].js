import { json } from '../../_lib/auth.js';
export async function onRequestGet({ env, params }) {
  const p = await env.DB.prepare('SELECT id,title,intro,letter,music_url,theme,status FROM pages WHERE slug=?').bind(params.slug).first();
  if (!p) return json({ error: 'not_found', message: "Cette page n'existe pas." }, 404);
  if (p.status !== 'published') return json({ error: 'not_published', message: "Cette page n'est pas encore disponible." }, 403);
  const { results } = await env.DB.prepare('SELECT kind,r2_key FROM media WHERE page_id=? ORDER BY position').bind(p.id).all();
  return json({ title: p.title, intro: p.intro, letter: p.letter, music_url: p.music_url, theme: p.theme,
    photos: results.filter((m) => m.kind === 'photo').map((m) => `/media/${m.r2_key}`),
    video: results.filter((m) => m.kind === 'video').map((m) => `/media/${m.r2_key}`)[0] || null });
}
