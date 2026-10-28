import { json } from '../../../_lib/auth.js';
export async function onRequestDelete({ env, params }) {
  const m = await env.DB.prepare('SELECT r2_key FROM media WHERE id=?').bind(params.id).first();
  if (!m) return json({ error: 'Fichier introuvable.' }, 404);
  await env.BUCKET.delete(m.r2_key);
  await env.DB.prepare('DELETE FROM media WHERE id=?').bind(params.id).run();
  return json({ ok: true });
}
