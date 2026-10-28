import { isAdmin, json } from '../../_lib/auth.js';
export async function onRequest(ctx) {
  if (!(await isAdmin(ctx.request, ctx.env))) return json({ error: 'Non autorisé. Reconnectez-vous.' }, 401);
  return ctx.next();
}
