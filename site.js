// Venda (Cloudflare Worker + Mercado Pago). VENDA_ABERTA false = botões ficam "Em breve" (sem download).
const LIC_API = 'https://dga-licencas.pires-softwares.workers.dev';
const VENDA_ABERTA = true;

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
  return `<rect x="${-w / 2}" y="-17" width="${w}" height="34" rx="17" fill="#0B0906" stroke="#7A4B00"/><text x="0" y="1" font-size="13" font-weight="600" fill="#EFE6D2" text-anchor="middle" dominant-baseline="central">${esc(text)}</text>`;
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
      <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C160B"/><stop offset="1" stop-color="#0F0B05"/></linearGradient>
      <linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC53D"/><stop offset="1" stop-color="#FFB000"/></linearGradient>
    </defs>
    <g class="disc"><circle r="${R_DISC}" fill="#0B0906"/><circle r="156.5" fill="none" stroke="#7A4B00" stroke-width="3"/>
    ${segs}<circle r="${R_HOLE - 4}" fill="#0B0906" stroke="#FFB000" stroke-width="2"/>${pill(centre.length > 22 ? centre.slice(0, 21) + '…' : centre)}<g class="ring">${ring}</g></g>`;
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

// ---------- conta (Firebase Auth) e licença ----------
// PREENCHER (dono): Firebase > Configurações do projeto > Seus apps > App da Web > Configuração do SDK.
// Estes valores são públicos (o apiKey do Firebase Web não é segredo); o projectId é o mesmo FIREBASE_PROJECT_ID do licenca/wrangler.toml.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAxfV4fdxdb_O7nSiEr2vyuM73yZyFvnmA',
  authDomain: 'dga-conversor-baf75.firebaseapp.com',
  projectId: 'dga-conversor-baf75',
  appId: '1:887677484679:web:81bf0836499cd5351fc222',
};
const FB_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const SENHA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VOLTA = () => ({ url: location.origin + location.pathname + '#licenca' }); // link do e-mail do Firebase volta para cá

const store = {
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: segue sem guardar */ } },
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  del: k => { try { localStorage.removeItem(k); } catch { /* idem */ } },
};
let fb = null, user = null, modo = 'entrar', fimMsg = ''; // fimMsg: aviso da exclusão, mostrado quando a sessão fecha
const msg = t => { $('contaMsg').textContent = t; };
const show = (sel, on) => document.querySelectorAll(sel).forEach(el => { el.hidden = !on; });

// Chamada ao Worker com o ID token. 401 uma vez: força token novo (o e-mail pode ter sido confirmado depois do token guardado).
async function api(rota, corpo) {
  const chamar = async novo => {
    const headers = { Authorization: 'Bearer ' + await user.getIdToken(novo) };
    const r = await fetch(LIC_API + rota, corpo === undefined ? { headers }
      : { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
  const r = await chamar(false);
  return r.status === 401 ? chamar(true) : r;
}

const ERROS = {
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Entre ou use “Esqueci a senha”.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'Confira o e-mail.',
  'auth/weak-password': 'Senha fraca: use 8 ou mais caracteres, com letra e número.',
  'auth/password-does-not-meet-requirements': 'Senha fraca: use 8 ou mais caracteres, com letra e número.',
  'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão. Confira a internet e tente de novo.',
};
const erro = e => ERROS[e?.code] || 'Não foi possível agora. Tente de novo.';

function setModo(m) {
  modo = m;
  if (!user) document.querySelectorAll('[data-form]').forEach(f => { f.hidden = f.dataset.form !== m; });
  if (!user) msg(m === 'criar' ? 'Crie sua conta. Depois confirme o e-mail pelo link que enviamos.' : m === 'esqueci' ? 'Enviamos um link para você criar uma senha nova.' : 'Entre com o e-mail e a senha que você usou no teste ou na compra para ver suas chaves.');
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-modo]');
  if (!a) return;
  if (a.dataset.volta) store.set('dga-volta', a.dataset.volta);
  setModo(a.dataset.modo);
});

function refresh() {
  const on = !!user, ok = on && user.emailVerified;
  show('[data-deslogado]', !on);
  show('[data-conta]', on);
  show('[data-form]', false);
  if (!on) setModo(modo);
  if (!on && fimMsg) { msg(fimMsg); fimMsg = ''; }
  $('verificar').hidden = !on || ok;
  $('logado').hidden = !ok;
  $('sair').hidden = !on;
  $('excluir').hidden = !on;
  $('contaPreco').hidden = !on;
  if (on) {
    $('vEmail').textContent = user.email;
    $('contaEmail').textContent = 'Conta: ' + user.email;
    $('contaPreco').textContent = ok ? 'Conta: ' + user.email : 'Confirme seu e-mail (link em Minha licença) para começar o teste.';
    msg(ok ? 'Suas chaves:' : 'Confirme seu e-mail para liberar o teste grátis e a compra.');
  }
  if (!ok) return;
  if (store.get('dga-sub')) return ligarTeste(store.get('dga-sub'));
  loadConta();
  if (store.get('dga-volta') === 'preco') { store.del('dga-volta'); $('preco').scrollIntoView(); }
}

function linha(ul, partes) {
  const li = document.createElement('li');
  for (const [tag, texto, cls] of partes) {
    const el = document.createElement(tag);
    el.textContent = texto;
    if (cls) el.className = cls;
    if (tag === 'button') { el.type = 'button'; el.dataset.copy = ''; el.className = 'btn alt'; }
    li.appendChild(el);
  }
  ul.appendChild(li);
}

async function loadConta() {
  const ul = $('chaves');
  ul.replaceChildren();
  let r;
  try { r = await api('/conta'); } catch { r = {}; }
  if (r.status !== 200) return msg('Não foi possível carregar suas chaves agora. Recarregue a página para tentar de novo.');
  for (const c of r.chaves || []) {
    const tipo = c.tipo === 'teste' ? 'Teste grátis de 7 dias' : 'Licença vitalícia';
    const uso = `${c.maquinas} de ${c.max} PCs em uso`;
    linha(ul, [['code', c.chave, 'key'], ['button', 'Copiar chave'], ['small', c.revogada ? `${tipo} · revogada${c.motivo ? ` (${c.motivo})` : ''}` : `${tipo} · ${uso}`]]);
  }
  for (const p of r.pendentes || []) {
    linha(ul, [['small', p.tipo === 'teste' ? 'Teste grátis: aguardando o Mercado Pago aceitar o cartão. Recarregue a página em alguns instantes.' : 'Compra: aguardando a aprovação do pagamento.']]);
  }
  if (!ul.children.length) msg('Nenhuma chave nesta conta ainda. Comece os 7 dias grátis em Preço.');
}

// Volta do Mercado Pago: liga a assinatura a esta conta. Sem sessão, guarda o id e liga depois de entrar.
async function ligarTeste(sub) {
  store.del('dga-sub');
  $('obrigado').hidden = false;
  const ob = $('obMsg');
  let r;
  try { r = await api('/assinatura', { assinatura: sub }); } catch { r = {}; }
  if (r.chave) evento('teste_confirmado');
  if (r.chave) ob.textContent = 'Sua chave está na sua conta, em Minha licença. Se não cancelar a assinatura no Mercado Pago, cobramos R$ 59 uma vez no 8º dia e a licença fica sua para sempre.';
  else if (r.pendente) ob.textContent = 'O Mercado Pago ainda está confirmando o cartão. Em alguns instantes a chave aparece na sua conta, em Minha licença.';
  else ob.textContent = r.status === 429 ? 'Muitas tentativas. Espere alguns minutos e abra Minha licença.' : 'Não encontramos este teste na sua conta. Entre com a mesma conta em que você clicou em “Começar 7 dias grátis”.';
  loadConta();
  if (r.pendente) setTimeout(loadConta, 15000);
}

async function startAuth() {
  if (!FIREBASE_CONFIG.apiKey) { msg('As contas abrem junto com a venda.'); return; }
  try {
    const [{ initializeApp }, A] = await Promise.all([import(FB_SDK + 'firebase-app.js'), import(FB_SDK + 'firebase-auth.js')]);
    fb = { auth: A.getAuth(initializeApp(FIREBASE_CONFIG)), A };
    A.onAuthStateChanged(fb.auth, u => { user = u; refresh(); });
  } catch { msg('Não foi possível carregar o login. Recarregue a página.'); }
}

document.querySelectorAll('[data-form]').forEach(f => f.addEventListener('submit', async e => {
  e.preventDefault();
  if (!fb) return;
  const { A, auth } = fb, email = f.email.value.trim(), btn = f.querySelector('button');
  if (!EMAIL.test(email)) return msg('Confira o e-mail.');
  if (f.dataset.form === 'criar') {
    if (!SENHA.test(f.senha.value)) return msg('A senha precisa de 8 ou mais caracteres, com pelo menos uma letra e um número.');
    if (f.senha.value !== f.senha2.value) return msg('As duas senhas não são iguais.');
  }
  btn.disabled = true;
  try {
    if (f.dataset.form === 'entrar') await A.signInWithEmailAndPassword(auth, email, f.senha.value);
    else if (f.dataset.form === 'criar') {
      const { user: u } = await A.createUserWithEmailAndPassword(auth, email, f.senha.value);
      await A.sendEmailVerification(u, VOLTA());
    } else {
      // mesma resposta exista ou não a conta
      await A.sendPasswordResetEmail(auth, email, VOLTA()).catch(err => { if (err.code !== 'auth/user-not-found') throw err; });
      msg('Se existir uma conta com este e-mail, enviamos o link para criar a senha nova. Confira também o spam.');
    }
    f.reset();
  } catch (err) { msg(erro(err)); }
  btn.disabled = false;
}));

$('jaConfirmei').addEventListener('click', async () => {
  try {
    await user.reload();
    if (!user.emailVerified) return msg('Ainda não confirmado. Clique no link do e-mail e tente de novo.');
    await user.getIdToken(true); // token novo com e-mail verificado
    refresh();
  } catch (err) { msg(erro(err)); }
});
$('reenviar').addEventListener('click', async () => {
  try { await fb.A.sendEmailVerification(user, VOLTA()); msg('Enviamos de novo. Confira também o spam.'); }
  catch (err) { msg(erro(err)); }
});
$('sair').addEventListener('click', () => fb.A.signOut(fb.auth));

// Exclusão em dois passos: digitar EXCLUIR libera o botão. O Worker apaga os dados; depois apaga o login no Firebase e sai.
$('excluirTxt').addEventListener('input', e => { $('excluirBtn').disabled = e.target.value.trim() !== 'EXCLUIR'; });
$('excluirBtn').addEventListener('click', async () => {
  const b = $('excluirBtn');
  b.disabled = true;
  let r;
  try { r = await api('/conta/excluir', {}); } catch { r = {}; }
  if (!r.ok) { b.disabled = false; return msg('Não foi possível excluir agora. Tente de novo em alguns minutos.'); }
  $('excluirTxt').value = '';
  fimMsg = 'Conta excluída. Seus dados e suas chaves foram apagados.';
  try { await fb.A.deleteUser(user); }
  catch (err) {
    // o Firebase pede login recente para apagar o login; os dados já saíram do Worker
    fimMsg = 'Seus dados e suas chaves foram apagados. Para apagar também o login, entre de novo e clique em Excluir conta outra vez.';
    console.warn(err?.code);
  }
  await fb.A.signOut(fb.auth).catch(() => {});
});

document.querySelectorAll('[data-teste]').forEach(b => {
  if (!VENDA_ABERTA) { b.hidden = true; return; }
  b.addEventListener('click', async e => {
    e.preventDefault();
    if (b.getAttribute('aria-disabled')) return;
    // sem conta confirmada: vai para entrar/confirmar e volta ao preço depois
    if (!user || !user.emailVerified) {
      store.set('dga-volta', 'preco');
      if (!user) setModo('entrar');
      $('licenca').scrollIntoView();
      return;
    }
    b.setAttribute('aria-disabled', 'true');
    const txt = b.textContent;
    b.textContent = 'Abrindo o Mercado Pago…';
    try {
      const r = await api('/teste', {});
      if (!r.init_point) throw new Error('sem init_point');
      location.href = r.init_point;
    } catch {
      b.removeAttribute('aria-disabled');
      b.textContent = txt;
      alert('Não foi possível abrir os 7 dias grátis. Tente de novo.');
    }
  });
});
$('soon').hidden = VENDA_ABERTA;

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const k = b.parentElement.querySelector('.key');
  try { await navigator.clipboard.writeText(k.textContent); b.textContent = 'Copiada!'; }
  catch { getSelection().selectAllChildren(k); b.textContent = 'Selecionada: Ctrl+C'; }
  setTimeout(() => { b.textContent = 'Copiar chave'; }, 2500);
});

// Google Analytics 4: só carrega com GA_ID preenchido e cookies aceitos (aviso #cookies). Sem GA_ID, nada aparece.
// Eventos: iniciar_teste (clique em "Começar 7 dias grátis"), baixar (clique no instalador), teste_confirmado (chave emitida).
var GA_ID = 'G-E8Q60CNMLM';
var gaOn = false;
function gaStart() {
  if (gaOn || !GA_ID) return;
  gaOn = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
}
function evento(nome, dados) { if (gaOn) window.gtag('event', nome, dados || {}); }
if (GA_ID) {
  const escolha = store.get('dga-cookies');
  if (escolha === 'sim') gaStart();
  else if (!escolha) $('cookies').hidden = false;
  $('cookiesLink').hidden = false;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-cookies]');
  if (c) {
    const sim = c.dataset.cookies === 'sim';
    store.set('dga-cookies', sim ? 'sim' : 'nao');
    $('cookies').hidden = true;
    if (sim) gaStart(); else if (gaOn) location.reload(); // recusou depois de aceitar: recarrega sem o GA
    return;
  }
  if (e.target.closest('#cookiesLink')) { e.preventDefault(); $('cookies').hidden = false; return; }
  const t = e.target.closest('[data-teste]');
  if (t) evento('iniciar_teste', { local: t.closest('section, nav')?.id || 'topo' });
  const d = e.target.closest('a[href*="DGA-Conversor-Setup.exe"]');
  if (d) evento('baixar', { local: d.closest('section, nav')?.id || 'topo' });
}, true);

// volta dos 7 dias grátis: ?teste=1&preapproval_id=<32 hex>; o id sai da barra de endereço e fica guardado até ligar à conta
const qs = new URLSearchParams(location.search), sub = qs.get('preapproval_id');
if (sub) history.replaceState(null, '', location.pathname + location.hash);
if (qs.has('teste')) {
  $('obrigado').hidden = false;
  $('obTitulo').textContent = '7 dias grátis ativados!';
  $('obMsg').textContent = 'Sua chave está na sua conta, em Minha licença. Entre com a mesma conta, se ainda não estiver conectado.';
  if (/^[0-9a-f]{32}$/.test(sub || '')) store.set('dga-sub', sub); // refresh() liga assim que a sessão do Firebase carregar
  $('obrigado').scrollIntoView();
}
startAuth();
// Assinatura (não remover): PS-2026-11-03-d0d36ea91566
