const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const JSONH = { 'Content-Type': 'application/json' };
const MB = 1048576;
const show = (v) => { $$('.view').forEach((e) => (e.hidden = e.id !== 'v-' + v)); scrollTo(0, 0); };
const sec = (n) => { $$('.sec').forEach((e) => (e.hidden = e.id !== 'sec-' + n)); $$('.side nav button').forEach((b) => b.classList.toggle('on', b.dataset.sec === n)); };
function toast(m, err) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (err ? ' err' : ''); clearTimeout(t._t); t._t = setTimeout(() => (t.className = ''), 3800); }
async function api(url, opt = {}) {
  let r; try { r = await fetch(url, { credentials: 'same-origin', ...opt }); } catch { throw new Error('Connexion impossible. Vérifiez votre réseau.'); }
  let d = {}; try { d = await r.json(); } catch {}
  if (r.status === 401 && url !== '/api/login') { show('login'); throw new Error('Session expirée, reconnectez-vous.'); }
  if (!r.ok) throw new Error(d.error || d.message || 'Erreur serveur (' + r.status + ').');
  return d;
}
const pageUrl = (slug) => location.origin + '/p/' + slug;
const fdate = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Lien copié.'); } catch { prompt('Copiez ce lien :', text); }
}

/* ---------- rendu d'une page souvenir (public + aperçu) ---------- */
function music(u, embed) {
  if (!u) return '';
  let m, src = '';
  if ((m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/))) src = 'https://www.youtube-nocookie.com/embed/' + m[1];
  else if ((m = u.match(/open\.spotify\.com\/(track|album|playlist|episode)\/(\w+)/))) src = `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
  const safe = /^https?:\/\//i.test(u) ? esc(u) : '#';
  if (embed && src) return `<div class="music"><h2>Écoute notre chanson</h2><iframe src="${src}" height="${src.includes('spotify') ? 152 : 210}" allow="encrypted-media; fullscreen" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="Chanson"></iframe><a href="${safe}" target="_blank" rel="noopener">Ouvrir sur la plateforme</a></div>`;
  return `<a class="music link" href="${safe}" target="_blank" rel="noopener">♪ Écoute notre chanson</a>`;
}
function renderPublic(el, d, embed = true) {
  const bg = d.photos[0] ? `background-image:linear-gradient(180deg,rgba(20,10,25,.2),rgba(20,10,25,.8)),url('${esc(d.photos[0])}')` : '';
  el.className = 'pub th-' + (d.theme || 'romantique');
  el.innerHTML = `<header class="pub-hero" style="${bg}"><div class="heart">♥</div><h1>${esc(d.title || 'Titre de la page')}</h1><p>${esc(d.intro)}</p></header>
  ${d.photos.length ? `<div class="gal">${d.photos.map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>` : ''}
  ${d.video ? `<video class="pub-video" src="${esc(d.video)}" controls playsinline preload="metadata"></video>` : ''}
  ${music(d.music_url, embed)}
  ${d.letter ? `<article class="letter">${esc(d.letter)}</article>` : ''}
  <footer class="pub-foot">3awed 3ichha</footer>`;
}
async function loadPublic(slug) {
  try {
    const r = await fetch('/api/p/' + encodeURIComponent(slug)); const d = await r.json();
    if (!r.ok) { $('#err-title').textContent = d.error === 'not_published' ? 'Bientôt disponible' : 'Page introuvable'; $('#err-msg').textContent = d.message || ''; return show('error'); }
    document.title = d.title + ' — 3awed 3ichha';
    renderPublic($('#pub'), { ...d, video: d.video }); show('public');
  } catch { $('#err-title').textContent = 'Connexion impossible'; $('#err-msg').textContent = 'Réessayez dans un instant.'; show('error'); }
}

/* ---------- admin : liste ---------- */
let PAGES = [];
function row(p) {
  const av = p.cover ? `style="background-image:url('/media/${esc(p.cover)}')"` : '';
  return `<div class="item" data-id="${p.id}"><div class="av" ${av}>${p.cover ? '' : esc(p.client_name[0].toUpperCase())}</div>
  <div class="info"><b>${esc(p.client_name)}</b><small>${esc(p.title)} · créé le ${fdate(p.created_at)}</small></div>
  <span class="badge ${p.status === 'published' ? '' : 'draft'}">${p.status === 'published' ? 'Publié' : 'Brouillon'}</span>
  <div class="acts"><button data-a="copy" data-slug="${p.slug}">Copier le lien NFC</button><button data-a="edit">Modifier</button><button data-a="toggle">${p.status === 'published' ? 'Dépublier' : 'Publier'}</button><button data-a="del">Supprimer</button></div></div>`;
}
async function loadList() {
  const q = $('#search').value.trim();
  const { pages } = await api('/api/admin/pages?q=' + encodeURIComponent(q));
  if (!q) PAGES = pages;
  $('#all').innerHTML = pages.map(row).join('') || '<p class="muted">Aucun client pour le moment. Cliquez sur « Créer une page ».</p>';
  $('#recent').innerHTML = PAGES.slice(0, 5).map(row).join('') || '<p class="muted">Aucun client pour le moment.</p>';
  $('#st-total').textContent = PAGES.length;
  $('#st-pub').textContent = PAGES.filter((p) => p.status === 'published').length;
  $('#st-draft').textContent = PAGES.filter((p) => p.status !== 'published').length;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const id = b.closest('.item').dataset.id;
  try {
    if (b.dataset.a === 'copy') copy(pageUrl(b.dataset.slug));
    if (b.dataset.a === 'edit') await openForm(id);
    if (b.dataset.a === 'toggle') {
      const { page } = await api('/api/admin/pages/' + id);
      await api('/api/admin/pages/' + id, { method: 'PUT', headers: JSONH, body: JSON.stringify({ ...page, status: page.status === 'published' ? 'draft' : 'published' }) });
      toast(page.status === 'published' ? 'Page dépubliée.' : 'Page publiée.'); await loadList();
    }
    if (b.dataset.a === 'del' && confirm('Supprimer définitivement cette page et tous ses fichiers ?')) {
      await api('/api/admin/pages/' + id, { method: 'DELETE' }); toast('Page supprimée.'); await loadList();
    }
  } catch (err) { toast(err.message, true); }
});
let st; $('#search').addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => loadList().catch((e) => toast(e.message, true)), 250); });

/* ---------- admin : formulaire ---------- */
let S;
const fresh = () => ({ id: null, slug: null, status: 'draft', theme: 'romantique', photos: [], video: null, removed: [] });
const val = () => ({ client_name: $('#f-name').value, title: $('#f-title').value, intro: $('#f-intro').value, letter: $('#f-letter').value, music_url: $('#f-music').value, theme: S.theme });
function preview() { renderPublic($('#pv'), { ...val(), photos: S.photos.map((p) => p.url), video: S.video?.url }, false); }
function renderThumbs() {
  $('#thumbs').innerHTML = S.photos.map((p, i) => `<div class="thumb"><img src="${esc(p.url)}" alt=""><div><button type="button" data-m="${i}" data-d="-1" aria-label="Avancer">←</button><button type="button" data-x="${i}" aria-label="Retirer">✕</button><button type="button" data-m="${i}" data-d="1" aria-label="Reculer">→</button></div></div>`).join('');
  $('#vid-box').innerHTML = S.video ? `<video controls playsinline src="${esc(S.video.url)}"></video><button type="button" class="link" id="vid-rm">Retirer la vidéo</button>` : '';
  preview();
}
function setTheme(t) { S.theme = t; $$('#themes button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); preview(); }
async function openForm(id) {
  S = fresh(); $('#form-err').textContent = ''; $('#save-status').textContent = '';
  ['name', 'title', 'intro', 'letter', 'music'].forEach((k) => ($('#f-' + k).value = ''));
  $('#form-title').textContent = id ? 'Modifier le client' : 'Nouveau client';
  if (id) {
    const d = await api('/api/admin/pages/' + id), p = d.page;
    Object.assign(S, { id: p.id, slug: p.slug, status: p.status, theme: p.theme });
    $('#f-name').value = p.client_name; $('#f-title').value = p.title; $('#f-intro').value = p.intro; $('#f-letter').value = p.letter; $('#f-music').value = p.music_url;
    d.media.forEach((m) => (m.kind === 'photo' ? S.photos.push({ id: m.id, url: m.url }) : (S.video = { id: m.id, url: m.url })));
  }
  setTheme(S.theme); renderThumbs(); sec('form'); $('#tabs button').click();
}
$$('[data-sec]').forEach((b) => b.addEventListener('click', async () => {
  try {
    if (b.dataset.sec === 'form') return openForm(null);
    if (b.dataset.sec !== 'done') await loadList(); sec(b.dataset.sec);
  } catch (e) { toast(e.message, true); }
}));
$('#themes').addEventListener('click', (e) => e.target.dataset.t && setTheme(e.target.dataset.t));
$('#tabs').addEventListener('click', (e) => { const t = e.target.dataset.tab; if (!t) return; $$('#tabs button').forEach((b) => b.classList.toggle('on', b === e.target)); $$('.tab').forEach((x) => (x.hidden = x.id !== 'tab-' + t)); });
['name', 'title', 'intro', 'letter', 'music'].forEach((k) => $('#f-' + k).addEventListener('input', preview));
function addPhotos(files) {
  [...files].forEach((f) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toast(`${f.name} : format non accepté (JPG, PNG, WebP).`, true);
    if (f.size > 10 * MB) return toast(`${f.name} : trop lourd (max 10 Mo).`, true);
    if (S.photos.length >= 30) return toast('Maximum 30 photos.', true);
    S.photos.push({ file: f, url: URL.createObjectURL(f) });
  }); renderThumbs();
}
$('#drop').addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') $('#f-photos').click(); e.preventDefault(); });
$('#f-photos').addEventListener('change', (e) => { addPhotos(e.target.files); e.target.value = ''; });
['dragover', 'dragleave', 'drop'].forEach((ev) => $('#drop').addEventListener(ev, (e) => { e.preventDefault(); $('#drop').classList.toggle('over', ev === 'dragover'); if (ev === 'drop') addPhotos(e.dataTransfer.files); }));
$('#thumbs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.x) { const [p] = S.photos.splice(+b.dataset.x, 1); if (p.id) S.removed.push(p.id); }
  else { const i = +b.dataset.m, j = i + +b.dataset.d; if (j < 0 || j >= S.photos.length) return; [S.photos[i], S.photos[j]] = [S.photos[j], S.photos[i]]; }
  renderThumbs();
});
$('#f-video').addEventListener('change', (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(f.type)) return toast('Format vidéo non accepté (MP4, WebM, MOV).', true);
  if (f.size > 90 * MB) return toast('Vidéo trop lourde (max 90 Mo).', true);
  if (S.video?.id) S.removed.push(S.video.id);
  S.video = { file: f, url: URL.createObjectURL(f) }; renderThumbs();
});
$('#vid-box').addEventListener('click', (e) => { if (e.target.id === 'vid-rm') { if (S.video.id) S.removed.push(S.video.id); S.video = null; renderThumbs(); } });

async function upload(file, kind) {
  return api(`/api/admin/upload?page=${S.id}&kind=${kind}`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
}
async function save(publish) {
  const err = $('#form-err'), stat = $('#save-status'), btns = [$('#btn-publish'), $('#btn-draft')];
  err.textContent = ''; const v = val();
  if (!v.client_name.trim()) return (err.textContent = 'Indiquez le nom du client.');
  if (!v.title.trim()) return (err.textContent = 'Indiquez le titre de la page.');
  btns.forEach((b) => (b.disabled = true));
  try {
    if (!S.id) { const r = await api('/api/admin/pages', { method: 'POST', headers: JSONH, body: JSON.stringify(v) }); S.id = r.id; S.slug = r.slug; }
    for (const id of S.removed) await api('/api/admin/media/' + id, { method: 'DELETE' });
    S.removed = [];
    const todo = S.photos.filter((p) => p.file).length + (S.video?.file ? 1 : 0); let n = 0; const order = [];
    for (const p of S.photos) {
      if (p.file) { stat.textContent = `Envoi ${++n}/${todo}…`; const r = await upload(p.file, 'photo'); p.id = r.id; p.url = r.url; p.file = null; }
      order.push(p.id);
    }
    if (S.video?.file) { stat.textContent = `Envoi ${++n}/${todo}…`; const r = await upload(S.video.file, 'video'); S.video = { id: r.id, url: r.url }; }
    stat.textContent = 'Enregistrement…';
    S.status = publish ? 'published' : S.status;
    await api('/api/admin/pages/' + S.id, { method: 'PUT', headers: JSONH, body: JSON.stringify({ ...v, status: S.status, order }) });
    stat.textContent = '';
    if (publish) {
      $('#done-url').value = pageUrl(S.slug); $('#done-open').href = pageUrl(S.slug); sec('done');
    } else toast('Brouillon enregistré.');
    renderThumbs(); loadList().catch(() => {});
  } catch (e) { err.textContent = e.message; stat.textContent = ''; }
  btns.forEach((b) => (b.disabled = false));
}
$('#btn-publish').addEventListener('click', () => save(true));
$('#btn-draft').addEventListener('click', () => save(false));
$('#done-copy').addEventListener('click', () => copy($('#done-url').value));

/* ---------- connexion / navigation ---------- */
async function enterAdmin() {
  try { await loadList(); show('admin'); sec('dash'); } catch { show('login'); }
}
$$('[data-go]').forEach((b) => b.addEventListener('click', () => (b.dataset.go === 'admin' ? enterAdmin() : show(b.dataset.go))));
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#login-err').textContent = '';
  try { await api('/api/login', { method: 'POST', headers: JSONH, body: JSON.stringify({ password: $('#pw').value }) }); $('#pw').value = ''; await enterAdmin(); }
  catch (er) { $('#login-err').textContent = er.message; }
});
$('#logout').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); show('home'); });
const m = location.pathname.match(/^\/p\/([\w-]+)\/?$/);
m ? loadPublic(m[1]) : show('home');
