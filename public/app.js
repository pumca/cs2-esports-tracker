'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAPS = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Overpass'];
const PALETTE = ['#e8b923', '#d6343b', '#2f6fdb', '#2e9e6a', '#7d4fc9', '#e8702a', '#1f2430', '#e9ecf1'];
const state = { teams: [], matches: [], standings: [], stats: null, logos: [] };

// ---------- címerek (saját, eredeti SVG-k; 48x48 alap, jelkép 24x24 rácson) ----------
const SHAPES = {
  shield: '<path d="M24 3 42 9v15c0 11-8 18-18 21C14 42 6 35 6 24V9z"/>',
  hex: '<path d="M24 3 42 13v22L24 45 6 35V13z"/>',
  circle: '<circle cx="24" cy="24" r="21"/>',
  badge: '<path d="M10 4h28l6 6v28l-6 6H10l-6-6V10z"/>',
  diamond: '<path d="M24 2 46 24 24 46 2 24z"/>',
};
const SYMBOLS = {
  bolt: '<path d="M13.5 2 5 13.5h5.5L9 22l9-12h-5.5z"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
  crosshair: '<g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="6.5"/><path d="M12 1.5v7M12 15.5v7M1.5 12h7M15.5 12h7"/></g>',
  flame: '<path d="M12 2c.8 4.200 5.500 6.100 5.500 11.200a5.500 5.500 0 0 1-11 0c0-2.200 1-3.500 2.200-4.600.1 2 1 3 2 3.200C10.200 8 10.500 5 12 2z"/>',
  crown: '<path d="M2.500 19.500 2 7l5.200 4.500L12 4l4.800 7.500L22 7l-.5 12.500z"/>',
  chevron: '<path d="M3.500 14.500 12 6l8.500 8.500V19L12 10.500 3.500 19z"/>',
  claw: '<path d="M4 3 8.500 21 9 21 6.800 3zM10.500 3 15 21l.5 0L13.300 3zM17 3l4.500 18 .5 0L19.800 3z"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3.200" fill="var(--sym-bg)"/>',
  mountain: '<path d="M1.500 20 9 6.500l4 6.500 3-4.500L22.500 20z"/>',
  gem: '<path d="M7 3h10l5 6-10 12L2 9z"/>',
};
const hashStr = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function iconOf(t) {
  if (t.icon) return t.icon;
  const h = hashStr(t.name || '?');
  const sh = Object.keys(SHAPES), sy = Object.keys(SYMBOLS);
  return { shape: sh[h % sh.length], symbol: sy[(h >> 3) % sy.length], color: PALETTE[(h >> 6) % 6] };
}
function emblemSvg(ic, size = 32) {
  const n = parseInt(ic.color.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  const ink = lum > 0.62 ? '#14161a' : '#ffffff';
  return `<svg class="emb" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <g fill="${ic.color}" stroke="rgba(0,0,0,.4)" stroke-width="1.5">${SHAPES[ic.shape]}</g>
    <g transform="translate(12 12)" fill="${ink}" color="${ink}" style="--sym-bg:${ic.color}">${SYMBOLS[ic.symbol]}</g></svg>`;
}
const emblem = (t, size) => t.logo
  ? `<img class="emb logo" src="${esc(t.logo)}" width="${size}" height="${size}" alt="${esc(t.name)}" loading="lazy">`
  : emblemSvg(iconOf(t), size);

// ---------- segédek ----------
async function api(url, opts) {
  const r = await fetch(url, opts);
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Hiba történt');
  return j;
}
const send = (method, url, body) => api(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const teamOf = (id) => state.teams.find((t) => t.id === id) || { id: 0, name: '?' };
const signed = (n) => `<span class="${n > 0 ? 'pos' : n < 0 ? 'neg' : ''}">${n > 0 ? '+' : ''}${n}</span>`;

function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}
function openModal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
function confirmBox(title, text) {
  return new Promise((resolve) => {
    openModal(`<h3>${esc(title)}</h3><p class="mut">${esc(text)}</p><div class="acts"><button class="btn sec" id="mc">Mégse</button><button class="btn del" id="mo">Törlés</button></div>`);
    $('#mc').onclick = () => { closeModal(); resolve(false); };
    $('#mo').onclick = () => { closeModal(); resolve(true); };
  });
}
function countUp(el, to) {
  const dec = String(to).includes('.') ? 1 : 0, t0 = performance.now();
  const step = (t) => { const p = Math.min(1, (t - t0) / 700); el.textContent = (to * (1 - (1 - p) ** 3)).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const stagger = (root) => root.querySelectorAll('tbody tr, .mrow, .tc').forEach((el, i) => { el.style.animationDelay = Math.min(i, 12) * 35 + 'ms'; });
const grow = (root) => requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w + '%'; })));

async function refresh() {
  [state.teams, state.matches, state.standings, state.stats, state.logos] = await Promise.all([
    api('/api/teams'), api('/api/matches'), api('/api/standings'), api('/api/stats'), api('/api/logos')]);
}

// ---------- címerszerkesztő ----------
function emblemBuilder(host, start, onChange) {
  const ic = { ...start };
  const logoName = (p) => p.split('/').pop().replace(/.w+$/, '');
  const draw = () => {
    const prev = ic.logo ? `<img class="emb logo" src="${esc(ic.logo)}" width="72" height="72" alt="">` : emblemSvg(ic, 72);
    host.innerHTML = `<div class="eb"><div class="prev">${prev}</div><div class="opts">
      ${state.logos.length ? `<div class="field">Hivatalos logó<div class="chips">${state.logos.map((p) => `<button type="button" class="chip ${ic.logo === p ? 'on' : ''}" data-logo="${esc(p)}" title="${esc(logoName(p))}"><img class="emb logo" src="${esc(p)}" width="26" height="26" alt=""></button>`).join('')}<button type="button" class="btn sec sm" data-logo="">Saját címer</button></div></div>` : ''}
      <div class="field">Forma<div class="chips">${Object.keys(SHAPES).map((k) => `<button type="button" class="chip ${ic.shape === k ? 'on' : ''}" data-shape="${k}" title="${k}">${emblemSvg({ ...ic, shape: k, symbol: ic.symbol }, 26)}</button>`).join('')}</div></div>
      <div class="field">Jelkép<div class="chips">${Object.keys(SYMBOLS).map((k) => `<button type="button" class="chip ${ic.symbol === k ? 'on' : ''}" data-symbol="${k}" title="${k}">${emblemSvg({ ...ic, symbol: k }, 26)}</button>`).join('')}</div></div>
      <div class="field">Szín<div class="chips">${PALETTE.map((c) => `<button type="button" class="sw ${ic.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" value="${ic.color}" data-custom></div></div>
    </div></div>`;
    onChange(ic);
  };
  host.onclick = (e) => {
    const b = e.target.closest('[data-shape],[data-symbol],[data-color],[data-logo]'); if (!b) return;
    if (b.dataset.logo !== undefined) { ic.logo = b.dataset.logo || null; draw(); return; }
    ic.logo = null;
    if (b.dataset.shape) ic.shape = b.dataset.shape;
    if (b.dataset.symbol) ic.symbol = b.dataset.symbol;
    if (b.dataset.color) ic.color = b.dataset.color;
    draw();
  };
  host.oninput = (e) => { if (e.target.dataset.custom !== undefined) { ic.color = e.target.value; ic.logo = null; draw(); } };
  draw();
  return ic;
}

// ---------- nézetek ----------
function matchRow(m, deletable) {
  const a = teamOf(m.team1Id), b = teamOf(m.team2Id);
  return `<div class="mrow">
    <div class="t ${m.winnerId === a.id ? 'w' : ''}">${emblem(a, 26)}<span>${esc(a.name)}</span></div>
    <div class="sc">${m.mapsWon1}<em>:</em>${m.mapsWon2}</div>
    <div class="t b ${m.winnerId === b.id ? 'w' : ''}"><span>${esc(b.name)}</span>${emblem(b, 26)}</div>
    ${deletable ? `<button class="btn del sm del" data-del-match="${m.id}">Törlés</button>` : `<span class="tag">BO${m.bestOf}</span>`}
    <div class="mp">${deletable ? `<span>BO${m.bestOf}</span>` : ''}${m.maps.map((x) => `<span>${esc(x.map || 'pálya')} <b>${x.score1}-${x.score2}</b>${Math.max(x.score1, x.score2) > 13 ? ' OT' : ''}</span>`).join('')}</div>
  </div>`;
}
function standingsTable(rows, full) {
  return `<table><thead><tr><th>#</th><th>Csapat</th><th class="r">M</th><th class="r">Gy</th><th class="r">V</th>${full ? '<th class="r">Pálya</th><th class="r">Kör</th>' : ''}<th class="r">Pont</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="${r.rank === 1 ? 'lead' : ''}"><td class="rk">${r.rank}</td><td><div class="tm">${emblem(teamOf(r.teamId), 24)}${esc(r.team)}</div></td>
      <td class="r">${r.played}</td><td class="r">${r.wins}</td><td class="r">${r.losses}</td>
      ${full ? `<td class="r">${signed(r.mapsWon - r.mapsLost)}</td><td class="r">${signed(r.roundsWon - r.roundsLost)}</td>` : ''}
      <td class="r pts">${r.points}</td></tr>`).join('')}</tbody></table>`;
}
const head = (t, p) => `<div class="page-head"><h1>${t}</h1><p>${p || ''}</p></div>`;

const views = {
  dashboard(el) {
    const s = state.stats;
    const mx = Math.max(1, ...s.mapPopularity.map((m) => m.count));
    const hi = Math.max(1, ...state.standings.map((r) => r.points));
    el.innerHTML = `${head('Áttekintés', 'Aktuális szezon')}
    <div class="strip">${[[s.teams, 'csapat'], [s.matches, 'meccs'], [s.maps, 'lejátszott pálya'], [s.avgRoundsPerMap, 'átlag kör / pálya'], [s.overtimes, 'hosszabbítás']]
      .map(([n, l]) => `<div><div class="n" data-count="${n}">0</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="cols">
      <section class="panel"><header><h2>Tabella</h2><a href="#/standings">Részletek →</a></header>${state.standings.length ? standingsTable(state.standings, false) : '<div class="empty">Még nincs csapat</div>'}</section>
      <section class="panel"><header><h2>Legutóbbi meccsek</h2><a href="#/matches">Összes →</a></header>${state.matches.slice(-4).reverse().map((m) => matchRow(m, false)).join('') || '<div class="empty">Még nincs meccs</div>'}</section>
    </div>
    <div class="cols eq">
      <section class="panel"><header><h2>Pontok</h2></header><div class="mapl">${state.standings.map((r) => `<div class="row"><span>${esc(r.team)}</span><div class="track"><div class="fill g" data-w="${r.points / hi * 100}"></div></div><b>${r.points}</b></div>`).join('')}</div></section>
      <section class="panel"><header><h2>Játszott pályák</h2></header><div class="mapl">${s.mapPopularity.map((m) => `<div class="row"><span>${esc(m.map)}</span><div class="track"><div class="fill" data-w="${m.count / mx * 100}"></div></div><b>${m.count}</b></div>`).join('') || '<div class="empty">Még nincs adat</div>'}</div></section>
    </div>`;
    el.querySelectorAll('[data-count]').forEach((n) => countUp(n, Number(n.dataset.count)));
    stagger(el); grow(el);
  },

  standings(el) {
    el.innerHTML = `${head('Tabella', 'Győzelem = 3 pont · döntetlen esetén pálya-, majd körkülönbség')}
      <section class="panel">${state.standings.length ? standingsTable(state.standings, true) : '<div class="empty">Adj hozzá csapatokat</div>'}</section>`;
    stagger(el);
  },

  matches(el) {
    el.innerHTML = `${head('Meccsek', state.matches.length + ' rögzített sorozat')}
      <div class="bar" style="margin-bottom:14px"><input id="q" placeholder="Keresés csapatra…" style="width:260px"><span class="grow"></span><a class="btn" href="#/new-match">+ Új meccs</a></div>
      <section class="panel" id="ml"></section>`;
    const draw = () => {
      const q = $('#q', el).value.toLowerCase();
      const list = state.matches.filter((m) => (teamOf(m.team1Id).name + ' ' + teamOf(m.team2Id).name).toLowerCase().includes(q)).reverse();
      $('#ml', el).innerHTML = list.map((m) => matchRow(m, true)).join('') || '<div class="empty">Nincs találat</div>';
      stagger(el);
    };
    $('#q', el).oninput = draw; draw();
  },

  teams(el) {
    el.innerHTML = `${head('Csapatok', state.teams.length + ' csapat')}
      <section class="panel"><header><h2>Új csapat</h2></header><form class="pad" id="tf">
        <div class="bar"><label class="field grow">Név<input name="name" required minlength="2"></label><label class="field">Ország<input name="country" maxlength="3" placeholder="HU" style="width:90px"></label></div>
        <div style="margin-top:16px" id="eb"></div>
        <div style="margin-top:16px"><button class="btn">Csapat felvétele</button></div></form></section>
      <div class="tgrid">${state.teams.map((t) => {
        const r = state.standings.find((x) => x.teamId === t.id) || {};
        return `<div class="tc">${emblem(t, 56)}<div class="info"><h3>${esc(t.name)}</h3><p>${esc(t.country || '—')} · ${r.wins || 0} gy / ${r.losses || 0} v · ${r.points || 0} pont</p>
          <div class="acts"><button class="btn sec sm" data-edit-team="${t.id}">Címer</button><button class="btn del sm" data-del-team="${t.id}">Törlés</button></div></div></div>`;
      }).join('')}</div>`;
    let ic = { shape: 'shield', symbol: 'bolt', color: PALETTE[Math.floor(Math.random() * 6)], logo: null };
    ic = emblemBuilder($('#eb', el), ic, () => {});
    $('#tf', el).onsubmit = async (e) => {
      e.preventDefault();
      try { await send('POST', '/api/teams', { name: e.target.name.value, country: e.target.country.value, icon: { shape: ic.shape, symbol: ic.symbol, color: ic.color }, logo: ic.logo || null }); toast('Csapat felvéve'); await go(); }
      catch (x) { toast(x.message, true); }
    };
    stagger(el);
  },

  'new-match'(el) {
    if (state.teams.length < 2) { el.innerHTML = `${head('Új meccs')}<div class="panel empty">Legalább két csapat kell. <a href="#/teams" style="color:var(--gold)">Csapatok</a></div>`; return; }
    const opts = state.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    let bo = 3;
    el.innerHTML = `${head('Új meccs', 'Pályánként add meg a végeredményt')}
      <section class="panel" style="max-width:720px"><form class="pad" onsubmit="return false">
        <div class="vs"><label class="field">Csapat 1<select id="t1">${opts}</select></label><i>vs</i><label class="field">Csapat 2<select id="t2">${opts}</select></label></div>
        <div style="margin-top:16px" class="seg" id="bo"><button type="button" data-bo="1">BO1</button><button type="button" data-bo="3" class="on">BO3</button><button type="button" data-bo="5">BO5</button></div>
        <div id="rows"></div><div class="hint" id="hint"></div>
        <div class="bar" style="margin-top:14px"><button type="button" class="btn" id="save">Mentés</button><button type="button" class="btn sec" id="add">+ Pálya</button></div></form></section>`;
    $('#t2', el).selectedIndex = 1;
    const rows = $('#rows', el);
    const valid = (a, b) => { if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false; const w = Math.max(a, b), l = Math.min(a, b); if (w === 13) return l <= 11; return w >= 16 && w % 3 === 1 && w - l >= 2 && w - l <= 4; };
    const addRow = () => {
      const i = rows.children.length + 1, d = document.createElement('div'); d.className = 'mr';
      d.innerHTML = `<span>${i}. pálya</span><select>${MAPS.map((m) => `<option>${m}</option>`).join('')}</select><input type="number" min="0" placeholder="13"><span>:</span><input type="number" min="0" placeholder="9">`;
      d.querySelector('select').selectedIndex = (i - 1) % MAPS.length;
      d.querySelectorAll('input').forEach((x) => x.addEventListener('input', check));
      rows.append(d);
    };
    const read = () => [...rows.children].map((r) => { const [a, b] = r.querySelectorAll('input'); return { row: r, map: r.querySelector('select').value, score1: a.value === '' ? NaN : +a.value, score2: b.value === '' ? NaN : +b.value }; });
    function check() {
      let msg = '';
      read().forEach((m) => { const bad = !isNaN(m.score1) && !isNaN(m.score2) && !valid(m.score1, m.score2); m.row.classList.toggle('bad', bad); if (bad && !msg) msg = `${m.score1}-${m.score2} nem érvényes CS2 eredmény`; });
      $('#hint').className = 'hint' + (msg ? ' err' : ''); $('#hint').textContent = msg || '13-x (x ≤ 11) · hosszabbításban 16-14, 19-17, …';
      return !msg;
    }
    const setBo = (n) => { bo = n; el.querySelectorAll('#bo button').forEach((b) => b.classList.toggle('on', +b.dataset.bo === n)); rows.innerHTML = ''; for (let i = 0; i < Math.ceil(n / 2); i++) addRow(); check(); };
    $('#bo', el).onclick = (e) => { if (e.target.dataset.bo) setBo(+e.target.dataset.bo); };
    $('#add', el).onclick = () => { if (rows.children.length < bo) addRow(); };
    $('#save', el).onclick = async () => {
      if (!check()) return;
      const maps = read().filter((m) => !isNaN(m.score1) && !isNaN(m.score2)).map(({ map, score1, score2 }) => ({ map, score1, score2 }));
      try { await send('POST', '/api/matches', { team1Id: +$('#t1').value, team2Id: +$('#t2').value, bestOf: bo, maps }); toast('Meccs rögzítve'); location.hash = '#/standings'; }
      catch (x) { $('#hint').className = 'hint err'; $('#hint').textContent = x.message; }
    };
    setBo(3);
  },
};

const routes = ['dashboard', 'standings', 'matches', 'teams', 'new-match'];
async function go() {
  const r = location.hash.replace('#/', '');
  const name = routes.includes(r) ? r : 'dashboard';
  try { await refresh(); } catch (e) {
    $('#view').innerHTML = `<div class="panel pad"><h2>Nem érem el a szervert</h2><p class="mut">Az oldalt az alkalmazás szerverén keresztül kell megnyitni (nem fájlként). Indítsd el a <b>start.bat</b>-ot, vagy futtasd az <b>npm start</b> parancsot, majd nyisd meg: <b>http://localhost:3000</b></p></div>`;
    return;
  }
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
  const v = $('#view'); v.innerHTML = '';
  views[name](v);
}

document.addEventListener('click', async (e) => {
  const dm = e.target.closest('[data-del-match]');
  if (dm && await confirmBox('Meccs törlése', 'A tabella újraszámolódik. Biztosan törlöd?')) {
    try { await api('/api/matches/' + dm.dataset.delMatch, { method: 'DELETE' }); toast('Meccs törölve'); await go(); } catch (x) { toast(x.message, true); }
  }
  const dt = e.target.closest('[data-del-team]');
  if (dt && await confirmBox('Csapat törlése', 'Biztosan törlöd ezt a csapatot?')) {
    try { await api('/api/teams/' + dt.dataset.delTeam, { method: 'DELETE' }); toast('Csapat törölve'); await go(); } catch (x) { toast(x.message, true); }
  }
  const et = e.target.closest('[data-edit-team]');
  if (et) {
    const t = teamOf(Number(et.dataset.editTeam));
    openModal(`<h3>${esc(t.name)} – címer</h3><div id="meb"></div><div class="acts"><button class="btn sec" id="mc">Mégse</button><button class="btn" id="ms">Mentés</button></div>`);
    const ic = emblemBuilder($('#meb'), { ...iconOf(t), logo: t.logo || null }, () => {});
    $('#mc').onclick = closeModal;
    $('#ms').onclick = async () => {
      try { await send('PATCH', '/api/teams/' + t.id, { icon: { shape: ic.shape, symbol: ic.symbol, color: ic.color }, logo: ic.logo || null }); closeModal(); toast('Címer mentve'); await go(); } catch (x) { toast(x.message, true); }
    };
  }
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
$('#theme').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; localStorage.setItem('theme', next);
};
document.documentElement.dataset.theme = localStorage.getItem('theme') || 'dark';
window.addEventListener('hashchange', go);
fetch('/health').then((r) => r.json()).then((h) => { $('#ver').textContent = 'v' + String(h.version).slice(0, 7); }).catch(() => {});
go();
