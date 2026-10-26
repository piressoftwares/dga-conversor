// Venda (Cloudflare Worker + Mercado Pago). VENDA_ABERTA false = botão leva ao download gratuito.
const LIC_API = 'https://dga-licencas.pires-softwares.workers.dev';
const VENDA_ABERTA = false;
const DOWNLOAD_URL = 'https://github.com/piressoftwares/dga-conversor/releases/latest/download/DGA-Conversor-Setup.exe';

// Demonstração da roda do DGA Conversor: mesma geometria e mesmos itens do app (assets/rodas.js vem do formats.js).
document.documentElement.classList.add('js');
const R = window.RODAS;
const $ = id => document.getElementById(id);
const svg = $('wheel'), stage = $('stage'), hint = $('hint'), desk = $('desk');
const R_DISC = 158, R_HOLE = 58, R_OUT = 150, RING_IN = 166, RING_OUT = 216, SW = 10, DWELL = 380;
const KEYMODE = { Shift: 'convert', Control: 'tools', Alt: 'actions' };
const HINTS = {
  idle: 'Arraste um arquivo até a roda e segure <kbd>Shift</kbd>.',
  drag: 'Agora aperte <kbd>Shift</kbd>, <kbd>Ctrl</kbd> ou <kbd>Alt</kbd>.',
  open: 'Pare num gomo para ver as opções e solte.',
  pick: 'Escolha um gomo. <kbd>Esc</kbd> cancela.',
};

const S = { mode: 'convert', kind: 'image', items: [], focus: -1, ring: -1, opt: -1, open: true, drag: null, pick: null, busy: false, timer: 0, scene: 'demo' };

const extOf = n => n.split('.').pop().toLowerCase();
const kindOf = n => Object.keys(R.kinds).find(k => R.kinds[k].includes(extOf(n))) || null;
const wheelFor = (mode, kind) => (mode === 'actions' ? R.actions : mode === 'tools' ? R.tools[kind || 'none'] || R.tools.none : R.convert[kind]) || [];

// ---------- desenho ----------
const rad = d => d * Math.PI / 180;
const pt = (r, a) => [+(r * Math.sin(a)).toFixed(2), +(-r * Math.cos(a)).toFixed(2)];
// gomo recuado + contorno da mesma cor com junção redonda = cantos arredondados (mesmo truque do app)
function wedge(a0, a1, r0, r1) {
  const ri = r0 + SW / 2, ro = r1 - SW / 2, pad = 3 + SW / 2;
  const A0 = rad(a0), A1 = rad(a1), i = pad / ri, o = pad / ro;
  const big = A1 - A0 - 2 * o > Math.PI ? 1 : 0;
  const [x1, y1] = pt(ri, A0 + i), [x2, y2] = pt(ro, A0 + o), [x3, y3] = pt(ro, A1 - o), [x4, y4] = pt(ri, A1 - i);
  return `M${x1} ${y1}L${x2} ${y2}A${ro} ${ro} 0 ${big} 1 ${x3} ${y3}L${x4} ${y4}A${ri} ${ri} 0 ${big} 0 ${x1} ${y1}Z`;
}
const annulus = (r0, r1) => `M0 ${-r1 + SW / 2}A${r1 - SW / 2} ${r1 - SW / 2} 0 1 1 0 ${r1 - SW / 2}A${r1 - SW / 2} ${r1 - SW / 2} 0 1 1 0 ${-r1 + SW / 2}ZM0 ${-r0 - SW / 2}A${r0 + SW / 2} ${r0 + SW / 2} 0 1 0 0 ${r0 + SW / 2}A${r0 + SW / 2} ${r0 + SW / 2} 0 1 0 0 ${-r0 - SW / 2}Z`;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function label(text, x, y, size, color) {
  const up = text.toUpperCase();
  const lines = up.length > 10 && up.includes(' ') ? [up.slice(0, up.lastIndexOf(' ', 11) > 0 ? up.lastIndexOf(' ', 11) : up.indexOf(' ')), ''] : [up];
  if (lines.length > 1) lines[1] = up.slice(lines[0].length + 1);
  const fs = lines.length > 1 || up.length > 8 ? size * 0.74 : size;
  return lines.map((l, k) => `<text x="${x}" y="${y + (k - (lines.length - 1) / 2) * fs * 1.1}" font-size="${fs}" font-weight="700" fill="${color}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`).join('');
}

function pill(text) {
  const w = Math.max(64, text.length * 7.4 + 28);
  return `<rect x="${-w / 2}" y="-17" width="${w}" height="34" rx="17" fill="#f4f4f6" stroke="#e2e2e7"/><text x="0" y="1" font-size="13" font-weight="600" fill="#1d1d1f" text-anchor="middle" dominant-baseline="central">${esc(text)}</text>`;
}

function render() {
  const items = S.items, n = items.length, span = 360 / Math.max(n, 1);
  let segs = '';
  items.forEach((it, i) => {
    const on = i === S.focus && S.opt < 0;
    const fill = on || (i === S.ring && S.opt >= 0) ? 'url(#go)' : 'url(#gl)';
    const d = n === 1 ? annulus(R_HOLE, R_OUT) : wedge(i * span - span / 2, i * span + span / 2, R_HOLE, R_OUT);
    const mid = rad(i * span), [lx, ly] = n === 1 ? [0, -104] : pt(104, mid);
    segs += `<g class="seg" data-i="${i}"><path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${SW}" stroke-linejoin="round" fill-rule="evenodd"/>${label(it.l, lx, ly, 15, on || (i === S.ring && S.opt >= 0) ? '#1a1100' : '#1d1d1f')}</g>`;
  });
  let ring = '';
  if (S.ring >= 0 && items[S.ring]?.o.length > 1) {
    const opts = items[S.ring].o, m = opts.length, os = Math.min(32, 360 / m), start = S.ring * span - (m * os) / 2;
    opts.forEach((o, j) => {
      const on = j === S.opt, a0 = start + j * os, [lx, ly] = pt(191, rad(a0 + os / 2));
      ring += `<g class="seg" style="animation-delay:${j * 30}ms"><path d="${wedge(a0, a0 + os, RING_IN, RING_OUT)}" fill="${on ? 'url(#go)' : 'url(#gl)'}" stroke="${on ? 'url(#go)' : 'url(#gl)'}" stroke-width="${SW}" stroke-linejoin="round"/>${label(o, lx, ly, 13, on ? '#1a1100' : '#1d1d1f')}</g>`;
    });
  }
  const it = items[S.focus], centre = it ? (S.opt >= 0 ? `${it.l} · ${it.o[S.opt]}` : it.l) : S.mode === 'actions' ? 'Ações' : R.labels[S.kind] || 'Arquivo';
  svg.innerHTML = `<defs>
      <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ebebee"/></linearGradient>
      <linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC53D"/><stop offset="1" stop-color="#FFB000"/></linearGradient>
    </defs>
    <g class="disc"><circle r="${R_DISC}" fill="#e4e3ea"/><circle r="156.5" fill="none" stroke="#f7f7f9" stroke-width="3"/>
    ${segs}<circle r="${R_HOLE - 4}" fill="#fff"/>${pill(centre.length > 22 ? centre.slice(0, 21) + '…' : centre)}<g class="ring">${ring}</g></g>`;
  svg.classList.toggle('closed', !S.open);
  document.querySelectorAll('#keys button').forEach(b => b.classList.toggle('on', S.open && b.dataset.mode === S.mode));
}

function setWheel(mode, kind, focus = -1, ring = -1, opt = -1) {
  Object.assign(S, { mode, kind, items: wheelFor(mode, kind), focus, ring, opt, open: true });
  render();
}
const setHint = (k, go = false) => { hint.innerHTML = HINTS[k]; hint.classList.toggle('go', go); };

// ---------- acerto pelo ângulo, como no app ----------
function hit(cx, cy) {
  const m = svg.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
  const r = Math.hypot(p.x, p.y), ang = (Math.atan2(p.x, -p.y) * 180 / Math.PI + 360) % 360, n = S.items.length;
  if (r < R_HOLE) return null;
  if (r <= R_DISC) return { ti: n === 1 ? 0 : Math.floor(((ang + 180 / n) % 360) / (360 / n)), oi: -1 };
  if (S.ring >= 0 && r <= RING_OUT + 14) {
    const opts = S.items[S.ring].o, os = Math.min(32, 360 / opts.length), start = S.ring * 360 / n - (opts.length * os) / 2;
    const rel = (ang - start + 720) % 360;
    if (rel < opts.length * os) return { ti: S.ring, oi: Math.floor(rel / os) };
  }
  return null;
}

function track(cx, cy) {
  const h = hit(cx, cy);
  const ti = h ? h.ti : S.ring >= 0 ? S.ring : -1, oi = h ? h.oi : -1;
  if (h && h.oi < 0 && h.ti !== S.ring) {
    clearTimeout(S.timer);
    if (S.ring >= 0) S.ring = -1;
    // parado num gomo com várias opções: abre o anel externo
    if (S.items[h.ti]?.o.length > 1) S.timer = setTimeout(() => { S.ring = h.ti; render(); }, DWELL);
  }
  if (ti !== S.focus || oi !== S.opt) { S.focus = h ? ti : -1; S.opt = oi; render(); }
}

// ---------- conversão simulada ----------
const SIZE = { jpg: 1.6, png: 3.1, webp: 0.6, heic: 0.5, avif: 0.4, tiff: 5, bmp: 6, ico: 0.1, pdf: 2.4, mp3: 0.19, m4a: 0.17, wav: 1, flac: 0.55, ogg: 0.15, opus: 0.09, aiff: 1, wma: 0.18, mp4: 0.8, mov: 1.3, mkv: 1, webm: 0.7, avi: 1.4, wmv: 1.1, gif: 0.24, docx: 1, odt: 0.8, md: 0.05, txt: 0.04, epub: 0.7, html: 0.6, zip: 0.92 };
const fmt = kb => (kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(kb))} KB`);
const kbOf = s => { const [v, u] = s.split(' '); return parseFloat(v.replace(',', '.')) * (u === 'MB' ? 1024 : 1); };

function freeName(base, ext) {
  const names = [...desk.querySelectorAll('.file')].map(f => f.dataset.name);
  let name = `${base}.${ext}`;
  for (let i = 1; names.includes(name); i++) name = `${base} (${i}).${ext}`;
  return name;
}

function addFile(name, size) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'file new';
  b.dataset.name = name;
  b.dataset.size = size;
  b.dataset.ext = extOf(name).toUpperCase();
  b.textContent = name;
  desk.appendChild(b);
  // a mesa só mostra os 4 originais e os 3 mais novos
  const made = desk.querySelectorAll('.file.new');
  if (made.length > 3) made[0].remove();
}

function toast(title, line, pct, cls = '') {
  $('toastTitle').textContent = title;
  $('toastLine').textContent = line;
  $('toastFill').style.width = `${Math.round(pct * 100)}%`;
  $('toast').className = `toast show ${cls}`;
}

const ACTION_DONE = { Compartilhar: 'Painel Compartilhar do Windows aberto', Flutuar: 'Arquivo flutuando no canto da tela', Copiar: 'Pronto para colar com Ctrl+V', Mover: 'Escolha a pasta de destino', 'Copiar caminho': 'Caminho copiado', Terminal: 'Terminal aberto na pasta' };

function run(file, ti, oi) {
  const it = S.items[ti], opt = it.o[Math.max(0, oi)], src = file.dataset.name, base = src.replace(/\.[^.]+$/, '');
  S.busy = true;
  S.open = false;
  render();
  if (S.mode === 'actions') {
    toast(it.l, ACTION_DONE[it.l] || 'Feito', 1);
    return finish();
  }
  let ext, name;
  if (S.mode === 'convert') {
    ext = it.l === 'GZIP' ? 'tar.gz' : it.l.toLowerCase();
    name = freeName(base, ext);
  } else {
    ext = it.l === 'ZIP' ? 'zip' : it.l === 'Juntar em PDF' ? 'pdf' : extOf(src);
    name = freeName(it.l === 'ZIP' ? base : it.l === 'Juntar em PDF' ? `${base} - junto` : `${base} - ${it.l.toLowerCase()}`, ext);
  }
  const title = S.mode === 'convert' ? `Convertendo para ${it.l}` : it.l;
  let p = 0;
  const t = setInterval(() => {
    p = Math.min(1, p + 0.09 + Math.random() * 0.08);
    toast(title, `${src} · ${Math.round(p * 100)}%`, p);
    if (p < 1) return;
    clearInterval(t);
    const kb = kbOf(file.dataset.size) * (S.mode === 'convert' ? (SIZE[ext] || 1) / (SIZE[extOf(src)] || 1) : it.l === 'Comprimir' ? 0.45 : 0.9);
    addFile(name, fmt(kb));
    toast('✓ Salvo', `${name} · ${opt}`, 1); // taste-skill-ignore: mesmo texto do app
    finish();
  }, 110);
}

function finish() {
  setTimeout(() => {
    $('toast').classList.remove('show');
    S.busy = false;
    setWheel(S.mode, S.kind);
    setHint('idle');
  }, 1700);
}

// ---------- arrastar (mouse e toque) ----------
let ghost = null, autoOpen = 0, longPress = 0;

function openFromDrag(mode) {
  clearTimeout(autoOpen);
  clearTimeout(longPress);
  setWheel(mode, S.drag.kind);
  setHint('open', true);
}

desk.addEventListener('pointerdown', e => {
  const f = e.target.closest('.file');
  if (!f || S.busy || e.button > 0) return;
  S.drag = { f, x: e.clientX, y: e.clientY, moved: false, kind: kindOf(f.dataset.name), touch: e.pointerType !== 'mouse' };
  f.setPointerCapture(e.pointerId);
  // no toque não há tecla: segurar um instante antes de arrastar abre a roda (como no Tangerine)
  if (S.drag.touch) longPress = setTimeout(() => S.drag && openFromDrag(S.mode), 350);
});

desk.addEventListener('pointermove', e => {
  const d = S.drag;
  if (!d) return;
  if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
    d.moved = true;
    S.pick = null;
    d.f.classList.add('lifted');
    ghost = document.createElement('div');
    ghost.className = 'ghost';
    ghost.dataset.ext = d.f.dataset.ext;
    ghost.innerHTML = `<span>${esc(d.f.dataset.name)}</span>`;
    document.body.appendChild(ghost);
    if (!d.touch) {
      S.open = false;
      S.items = wheelFor(S.mode, d.kind);
      S.kind = d.kind;
      render();
      setHint('drag', true);
      // quem não usar o teclado vê a roda abrir sozinha depois de um tempo
      autoOpen = setTimeout(() => S.drag && !S.open && openFromDrag(S.mode), 1400);
    }
  }
  if (!d.moved) return;
  ghost.style.left = `${e.clientX}px`;
  ghost.style.top = `${e.clientY}px`;
  if (S.open) track(e.clientX, e.clientY);
});

function endDrag(e, cancelled) {
  const d = S.drag;
  if (!d) return;
  clearTimeout(autoOpen);
  clearTimeout(longPress);
  clearTimeout(S.timer);
  S.drag = null;
  d.f.classList.remove('lifted');
  ghost?.remove();
  ghost = null;
  if (!d.moved) {
    if (S.open && d.touch && !cancelled) return startPick(d.f); // segurou sem arrastar: escolhe tocando
    return cancelled ? null : startPick(d.f);
  }
  const h = !cancelled && S.open ? hit(e.clientX, e.clientY) : null;
  if (h) run(d.f, h.ti, h.oi);
  else { setWheel(S.mode, S.kind); setHint('idle'); }
}
desk.addEventListener('pointerup', e => endDrag(e, false));
desk.addEventListener('pointercancel', e => endDrag(e, true));

// ---------- escolher por clique ou teclado ----------
function startPick(f) {
  S.pick = f;
  setWheel(S.mode, kindOf(f.dataset.name), 0);
  setHint('pick', true);
}

svg.addEventListener('pointermove', e => { if (S.pick && !S.busy) track(e.clientX, e.clientY); });
svg.addEventListener('click', e => {
  if (!S.pick || S.busy) return;
  const h = hit(e.clientX, e.clientY);
  if (!h) return;
  if (h.oi < 0 && S.items[h.ti].o.length > 1 && S.ring !== h.ti) { S.ring = h.ti; S.focus = h.ti; render(); return; }
  const f = S.pick;
  S.pick = null;
  run(f, h.ti, h.oi);
});
document.addEventListener('click', e => {
  if (S.pick && !e.target.closest('#wheel, .file')) { S.pick = null; setWheel(S.mode, S.kind); setHint('idle'); }
});

document.addEventListener('keydown', e => {
  if (KEYMODE[e.key] && (S.drag?.moved || S.pick)) {
    if (e.key === 'Alt') e.preventDefault(); // Alt sozinho abriria o menu do navegador
    if (S.drag) openFromDrag(KEYMODE[e.key]);
    else { setWheel(KEYMODE[e.key], S.kind, 0); }
    return;
  }
  if (!S.pick || S.busy) return;
  const n = S.items.length;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    S.focus = (S.focus + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; S.ring = -1; S.opt = -1; render();
  } else if (e.key === 'ArrowUp' && S.items[S.focus]?.o.length > 1) {
    e.preventDefault(); S.ring = S.focus; S.opt = 0; render();
  } else if (e.key === 'ArrowDown' && S.ring >= 0) {
    e.preventDefault(); S.ring = -1; S.opt = -1; render();
  } else if (e.key === 'Enter') {
    e.preventDefault(); const f = S.pick; S.pick = null; run(f, S.focus, S.opt);
  } else if (e.key === 'Escape') {
    S.pick = null; setWheel(S.mode, S.kind); setHint('idle');
  }
});

desk.addEventListener('keydown', e => {
  const f = e.target.closest('.file');
  if (f && (e.key === 'Enter' || e.key === ' ') && !S.pick) { e.preventDefault(); e.stopPropagation(); startPick(f); }
});

$('keys').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b && !S.busy) setWheel(b.dataset.mode, b.dataset.mode === 'actions' ? S.kind : S.kind || 'image', S.pick ? 0 : -1);
});

// ---------- cenas: cada seção da coluna "aperta" uma tecla ----------
const SCENES = {
  demo: () => setWheel('convert', 'image'),
  step1: () => { setWheel('convert', 'image'); desk.firstElementChild.classList.add('lifted'); setHint('drag', true); },
  step2: () => setWheel('convert', 'image', 0),
  step3: () => { setWheel('convert', 'image', 0, 0, 1); },
  folder: () => { S.open = false; render(); showFolder(); },
  tools: () => setWheel('tools', 'video', 1),
  pdf: () => setWheel('tools', 'pdf', R.tools.pdf.findIndex(i => i.l === 'Extrair páginas')),
  doc: () => setWheel('convert', 'doc', 0),
  actions: () => setWheel('actions', S.kind, 1),
  convert: () => setWheel('convert', 'audio', 0, 0, 1),
};

function scene(name) {
  if (S.scene === name || S.drag || S.pick || S.busy) return;
  S.scene = name;
  desk.firstElementChild.classList.remove('lifted');
  setHint('idle');
  $('folderView').hidden = true;
  $('toast').classList.remove('show');
  stage.querySelector('.field').classList.toggle('busy', false);
  SCENES[name]?.();
}

const wide = matchMedia('(min-width: 861px)');
const sceneIO = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && wide.matches) scene(en.target.dataset.scene); }), { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('[data-scene]').forEach(el => sceneIO.observe(el));
const stepIO = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('active', en.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' });
document.querySelectorAll('.step').forEach(el => stepIO.observe(el));

// ---------- "Nasce ao lado do original" ----------
function showFolder() {
  const b = document.querySelector('#outputs [aria-selected="true"]');
  const type = n => `Arquivo ${extOf(n).toUpperCase()}`;
  const row = (n, s, cls = '') => `<div class="row ${cls}"><span><i class="ico">${esc(extOf(n).toUpperCase())}</i>${esc(n)}</span><span>${type(n)}</span><span>${s}</span></div>`;
  const v = $('folderView');
  v.innerHTML = `<div class="path">Área de trabalho › Projeto</div>
    <div class="row head"><span>Nome</span><span>Tipo</span><span>Tamanho</span></div>
    ${row(b.dataset.from, b.dataset.a)}${row(b.dataset.to, b.dataset.b, 'new')}${row('notas.txt', '2 KB')}`;
  v.hidden = false;
  v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
}
$('outputs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  document.querySelectorAll('#outputs button').forEach(x => x.setAttribute('aria-selected', x === b));
  if (wide.matches) { S.scene = 'folder'; S.open = false; render(); showFolder(); }
});

// ---------- formatos ----------
const bars = $('bars');
Object.keys(R.kinds).forEach((k, i) => {
  const conv = R.convert[k] || [], tools = (R.tools[k] || []).map(t => t.l);
  const d = document.createElement('details');
  if (i === 0) d.open = true;
  d.innerHTML = `<summary>${esc(R.labels[k])}<small>${R.kinds[k].length} de entrada, ${conv.length} de saída</small></summary>
    <div class="in"><p><b>Entra:</b> ${R.kinds[k].map(x => x.toUpperCase()).join(', ')}</p>
    <ul>${conv.map(c => `<li>${esc(c.l)}<span>${esc(c.o.join(' · '))}</span></li>`).join('')}</ul>
    <p style="margin-top:14px"><b>Ferramentas:</b> ${esc(tools.join(', '))}</p></div>`;
  bars.appendChild(d);
});

// ---------- entrada das seções ----------
const revealIO = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.steps, .beside, .features, .formats, .faq, .cta, .foot-menu').forEach(sec => {
  [...sec.querySelectorAll('h2, h3, .step > p, .intro, .outputs, .panel, .mod p, .bars, .answers p, .cta > *, li, .foot-info')].forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 6) * 70}ms`;
    revealIO.observe(el);
  });
});

desk.querySelectorAll('.file').forEach(f => { f.dataset.ext = extOf(f.dataset.name).toUpperCase(); });
setWheel('convert', 'image');

// ---------- temas ----------
document.querySelectorAll('#temaTabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#temaTabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  const img = document.getElementById('temaImg');
  img.src = `assets/ui/temas/${b.dataset.t}.webp`;
  img.alt = `Roda do tema ${b.textContent}`;
  document.getElementById('temaTxt').textContent = b.dataset.d;
}));

// ---------- venda e licença ----------
const post = (rota, corpo) => fetch(LIC_API + rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
  .then(async r => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const store = { set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: segue sem guardar */ } } };

document.querySelectorAll('[data-buy]').forEach(b => {
  if (!VENDA_ABERTA) { b.href = DOWNLOAD_URL; b.textContent = 'Baixar grátis no lançamento'; return; } // o aviso "venda abre em breve" fica no #soon
  b.textContent = 'Comprar por R$ 59';
  b.addEventListener('click', async e => {
    e.preventDefault();
    if (b.getAttribute('aria-disabled')) return;
    b.setAttribute('aria-disabled', 'true');
    b.textContent = 'Abrindo o pagamento…';
    try {
      const r = await post('/checkout', {});
      if (!r.url) throw new Error('sem url');
      if (r.ref) store.set('dga-ref', r.ref);
      location.href = r.url;
    } catch {
      b.removeAttribute('aria-disabled');
      b.textContent = 'Comprar por R$ 59';
      alert('Não foi possível abrir o pagamento. Tente de novo.');
    }
  });
});
$('soon').hidden = VENDA_ABERTA;

function showKey(box, chave) {
  box.querySelector('.key').textContent = chave;
  box.hidden = false;
}
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const k = b.parentElement.querySelector('.key');
  try { await navigator.clipboard.writeText(k.textContent); b.textContent = 'Copiada!'; }
  catch { getSelection().selectAllChildren(k); b.textContent = 'Selecionada: Ctrl+C'; }
  setTimeout(() => { b.textContent = 'Copiar chave'; }, 2500);
}));

// volta do Mercado Pago: ?ref=<32 hex>#obrigado; Pix pode demorar, então consulta a cada 4 s por ~3 min
const ref = new URLSearchParams(location.search).get('ref');
if (/^[0-9a-f]{32}$/.test(ref || '')) {
  store.set('dga-ref', ref);
  $('obrigado').hidden = false;
  const msg = $('obMsg'), t0 = Date.now();
  const tentar = async () => {
    let erro = false;
    try {
      const r = await post('/pedido', { ref });
      if (r.chave) {
        msg.textContent = 'Pagamento confirmado. Sua chave:';
        return showKey($('obKey'), r.chave);
      }
    } catch { erro = true; }
    if (Date.now() - t0 > 180000) {
      msg.innerHTML = 'Ainda não confirmou. Se pagou com Pix pode levar alguns minutos — deixe esta página aberta ou use “Recuperar chave” com o número da operação do comprovante do Mercado Pago. <a href="#recuperar">Recuperar chave</a>';
      return;
    }
    msg.textContent = erro ? 'Sem conexão com o servidor. Tentando de novo…' : 'Confirmando o pagamento… Com Pix pode levar alguns minutos. Deixe esta página aberta.';
    setTimeout(tentar, 4000);
  };
  tentar();
  if (location.hash === '#obrigado') $('obrigado').scrollIntoView();
}

$('recForm').addEventListener('submit', async e => {
  e.preventDefault();
  const m = $('recMsg'), btn = e.submitter;
  $('recKey').hidden = true;
  const pagamento = $('recPag').value.trim(), email = $('recMail').value.trim();
  if (!/^\d{1,20}$/.test(pagamento) || !email) { m.textContent = 'Confira o número da operação (só números) e o e-mail.'; return; }
  btn.disabled = true;
  m.textContent = 'Procurando…';
  try {
    const r = await post('/recuperar', { pagamento, email });
    if (r.chave) { m.textContent = 'Encontramos sua compra. Sua chave:'; showKey($('recKey'), r.chave); }
    else m.textContent = r.status === 400 ? 'Confira o número da operação (só números) e o e-mail.' : 'Não encontramos uma compra com esses dados.';
  } catch { m.textContent = 'Não foi possível consultar agora. Tente de novo.'; }
  btn.disabled = false;
});
