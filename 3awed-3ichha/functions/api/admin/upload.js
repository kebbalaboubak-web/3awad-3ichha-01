import { json } from '../../_lib/auth.js';
const MB = 1024 * 1024;
const RULES = {
  photo: { max: 10 * MB, count: 30, types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } },
  video: { max: 90 * MB, count: 1, types: { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' } },
};
// POST /api/admin/upload?page=ID&kind=photo|video   (corps = fichier brut, Content-Type = type du fichier)
export async function onRequestPost({ request, env }) {
  const u = new URL(request.url), pageId = u.searchParams.get('page'), kind = u.searchParams.get('kind');
  const rule = RULES[kind];
  if (!rule) return json({ error: 'Type de média inconnu.' }, 400);
  const mime = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const ext = rule.types[mime];
  if (!ext) return json({ error: `Format non accepté (${Object.keys(rule.types).join(', ')}).` }, 415);
  const len = Number(request.headers.get('Content-Length'));
  if (!len) return json({ error: 'Taille du fichier inconnue.' }, 411);
  if (len > rule.max) return json({ error: `Fichier trop lourd (maximum ${rule.max / MB} Mo).` }, 413);
  if (!(await env.DB.prepare('SELECT 1 FROM pages WHERE id=?').bind(pageId).first())) return json({ error: 'Page introuvable.' }, 404);
  const st = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(position),-1) AS mx FROM media WHERE page_id=? AND kind=?').bind(pageId, kind).first();
  if (st.n >= rule.count) return json({ error: `Maximum ${rule.count} ${kind === 'photo' ? 'photos' : 'vidéo'} par page.` }, 409);
  const id = crypto.randomUUID(), key = `${pageId}/${id}.${ext}`;
  const obj = await env.BUCKET.put(key, request.body, { httpMetadata: { contentType: mime } });
  if (obj.size > rule.max) { await env.BUCKET.delete(key); return json({ error: 'Fichier trop lourd.' }, 413); }
  try {
    await env.DB.prepare('INSERT INTO media (id,page_id,kind,r2_key,mime,size,position) VALUES (?,?,?,?,?,?,?)')
      .bind(id, pageId, kind, key, mime, obj.size, st.mx + 1).run();
  } catch (e) {
    await env.BUCKET.delete(key);
    return json({ error: 'Enregistrement impossible, réessayez.' }, 500);
  }
  return json({ id, kind, url: `/media/${key}`, size: obj.size }, 201);
}
