export const rid = (n = 10) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => x.toString(16).padStart(2, '0')).join('');
export function clean(b) {
  const s = (v, max) => String(v ?? '').trim().slice(0, max);
  const o = { client_name: s(b.client_name, 100), title: s(b.title, 150), intro: s(b.intro, 500),
    letter: s(b.letter, 10000), music_url: s(b.music_url, 500), theme: s(b.theme, 20) };
  if (!o.client_name) return { error: 'Le nom du client est obligatoire.' };
  if (!o.title) return { error: 'Le titre de la page est obligatoire.' };
  if (o.music_url && !/^https?:\/\/\S+$/i.test(o.music_url)) return { error: 'Le lien de la chanson doit commencer par http:// ou https://.' };
  if (!['romantique', 'moderne', 'elegant', 'nature'].includes(o.theme)) o.theme = 'romantique';
  return { data: o };
}
