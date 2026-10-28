const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hmac(secret, data) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export async function checkPassword(env, given) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return false;
  return safeEqual(await hmac(env.SESSION_SECRET, String(given)), await hmac(env.SESSION_SECRET, env.ADMIN_PASSWORD));
}
export async function makeSession(env) {
  const exp = String(Date.now() + 7 * 864e5);
  return `${exp}.${await hmac(env.SESSION_SECRET, exp)}`;
}
export async function isAdmin(request, env) {
  const m = (request.headers.get('Cookie') || '').match(/(?:^|; )session=([^;]+)/);
  if (!m || !env.SESSION_SECRET) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, exp));
}
export const json = (d, s = 200, h = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
