import { checkPassword, makeSession, json } from '../_lib/auth.js';
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!(await checkPassword(env, b.password ?? ''))) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: 'Mot de passe incorrect.' }, 401);
  }
  const cookie = `session=${await makeSession(env)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 86400}`;
  return json({ ok: true }, 200, { 'Set-Cookie': cookie });
}
