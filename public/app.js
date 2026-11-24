'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAPS = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Overpass'];
const COLORS = ['#ff8a1f', '#5b9dff', '#34d399', '#e879f9', '#f87171', '#facc15', '#22d3ee', '#a78bfa'];
const state = { teams: [], matches: [], standings: [], stats: null };

// ---------- segédek ----------
async function api(url, opts) {
  const r = await fetch(url, opts);
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Hiba történt');
  return j;
}
const post = (url, body) => api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const del = (url) => api(url, { method: 'DELETE' });
const colorOf = (id) => COLORS[(id - 1) % COLORS.length];
const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
const avatar = (t) => `<span class="avatar" style="background:${colorOf(t.id)}">${esc(initials(t.name))}</span>`;
const teamOf = (id) => state.teams.find((t) => t.id === id) || { id: 0, name: '?' };
const signed = (n) => `<span class="${n > 0 ? 'pos' : n < 0 ? 'neg' : ''}">${n > 0 ? '+' : ''}${n}</span>`;

function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

function confirmBox(title, text) {
  return new Promise((resolve) => {
    $('#modal-box').innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="acts"><button class="btn ghost" id="mc">Mégse</button><button class="btn danger" id="mo">Törlés</button></div>`;
    $('#modal').classList.remove('hidden');
    const done = (v) => { $('#modal').classList.add('hidden'); resolve(v); };
    $('#mc').onclick = () => done(false);
    $('#mo').onclick = () => done(true);
  });
}

function countUp(el, to, ms = 900) {
  const dec = String(to).includes('.') ? 1 : 0;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const stagger = (root) => root.querySelectorAll('tbody tr, .match').forEach((el, i) => { el.style.animationDelay = i * 45 + 'ms'; });
const growBars = (root) => requestAnimationFrame(() => requestAnimationFrame(() => {
  root.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w + '%'; });
  root.querySelectorAll('[data-h]').forEach((el) => { el.style.height = el.dataset.h + 'px'; });
}));

async function refresh() {
  [state.teams, state.matches, state.standings, state.stats] = await Promise.all([
    api('/api/teams'), api('/api/matches'), api('/api/standings'), api('/api/stats')]);
}

// ---------- nézetek ----------
function matchHtml(m, deletable) {
  const a = teamOf(m.team1Id), b = teamOf(m.team2Id);
  return `<div class="match">
    <div class="side ${m.winnerId === a.id ? 'win' : ''}">${avatar(a)}${esc(a.name)}</div>
    <div class="scoreb">${m.mapsWon1} : ${m.mapsWon2}</div>
    <div class="side r ${m.winnerId === b.id ? 'win' : ''}">${esc(b.name)}${avatar(b)}</div>
    ${deletable ? `<button class="btn danger sm del" data-del-match="${m.id}">Törlés</button>` : '<span class="pill">BO' + m.bestOf + '</span>'}
    <div class="maps"><span class="pill">BO${m.bestOf}</span>${m.maps.map((x) => `<span class="mapchip">${esc(x.map || 'pálya')} <b>${x.score1}-${x.score2}</b>${Math.max(x.score1, x.score2) > 13 ? ' ⏱' : ''}</span>`).join('')}</div>
  </div>`;
}

const views = {
  dashboard(el) {
    const s = state.stats, st = state.standings;
    const max = Math.max(1, ...st.map((r) => r.points));
    const maxMap = Math.max(1, ...s.mapPopularity.map((m) => m.count));
    const top = [st[1], st[0], st[2]].filter(Boolean);
    const cls = { 0: 'p2', 1: 'p1', 2: 'p3' };
    el.innerHTML = `
    <div class="grid cards">
      ${[['👥', s.teams, 'Csapat'], ['⚔', s.matches, 'Lejátszott meccs'], ['🗺', s.maps, 'Pálya'], ['🎯', s.avgRoundsPerMap, 'Átlag kör / pálya'], ['⏱', s.overtimes, 'Hosszabbítás']]
        .map(([i, n, l], k) => `<div class="card stat" style="animation-delay:${k * 70}ms"><span class="ico">${i}</span><div class="num" data-count="${n}">0</div><div class="lbl">${l}</div></div>`).join('')}
    </div>
    <div class="grid two">
      <div class="card"><h2>🏆 Dobogó</h2>
        ${top.length ? `<div class="podium">${top.map((r, i) => `<div class="pod ${cls[i]}"><div class="nm">${esc(r.team)}</div><div class="pt">${r.points} pont</div><div class="blk" data-h="${r.rank === 1 ? 120 : r.rank === 2 ? 90 : 65}">${r.rank}</div></div>`).join('')}</div>` : '<div class="empty">Még nincs adat</div>'}
      </div>
      <div class="card"><h2>🗺 Pálya népszerűség</h2>
        <div class="bars">${s.mapPopularity.map((m) => `<div class="bar-row"><span>${esc(m.map)}</span><div class="bar-track"><div class="bar-fill blue" data-w="${m.count / maxMap * 100}"></div></div><b>${m.count}</b></div>`).join('') || '<div class="empty">Még nincs adat</div>'}</div>
      </div>
    </div>
    <div class="grid two" style="margin-top:18px">
      <div class="card"><h2>📊 Pontok csapatonként</h2>
        <div class="bars">${st.map((r) => `<div class="bar-row"><span>${esc(r.team)}</span><div class="bar-track"><div class="bar-fill" data-w="${r.points / max * 100}"></div></div><b>${r.points}</b></div>`).join('') || '<div class="empty">Még nincs adat</div>'}</div>
      </div>
      <div class="card"><h2>⚡ Legutóbbi meccsek</h2>${state.matches.slice(-3).reverse().map((m) => matchHtml(m, false)).join('') || '<div class="empty">Még nincs meccs</div>'}</div>
    </div>`;
    el.querySelectorAll('[data-count]').forEach((n) => countUp(n, Number(n.dataset.count)));
    growBars(el);
  },

  standings(el) {
    el.innerHTML = `<div class="card"><h2>🏆 Tabella</h2>
      <table><thead><tr><th>#</th><th>Csapat</th><th class="num">M</th><th class="num">Gy</th><th class="num">V</th><th class="num">Pálya +/-</th><th class="num">Kör +/-</th><th class="num">Pont</th></tr></thead><tbody>
      ${state.standings.map((r) => `<tr><td><span class="rank ${r.rank <= 3 ? 'r' + r.rank : ''}">${r.rank}</span></td>
        <td><div class="team">${avatar(teamOf(r.teamId))}${esc(r.team)}</div></td>
        <td class="num">${r.played}</td><td class="num">${r.wins}</td><td class="num">${r.losses}</td>
        <td class="num">${signed(r.mapsWon - r.mapsLost)}</td><td class="num">${signed(r.roundsWon - r.roundsLost)}</td>
        <td class="num"><b>${r.points}</b></td></tr>`).join('')}
      </tbody></table>${state.standings.length ? '' : '<div class="empty">Adj hozzá csapatokat!</div>'}</div>`;
    stagger(el);
  },

  matches(el) {
    el.innerHTML = `<div class="toolbar"><input id="q" placeholder="Keresés csapatra…"><div class="grow"></div><a class="btn" href="#/new-match">＋ Új meccs</a></div>
      <div class="card match-wrap" id="ml"></div>`;
    const draw = () => {
      const q = $('#q', el).value.toLowerCase();
      const list = state.matches.filter((m) => (teamOf(m.team1Id).name + ' ' + teamOf(m.team2Id).name).toLowerCase().includes(q)).reverse();
      $('#ml', el).innerHTML = list.map((m) => matchHtml(m, true)).join('') || '<div class="empty">Nincs találat</div>';
      stagger(el);
    };
    $('#q', el).oninput = draw; draw();
  },

  teams(el) {
    el.innerHTML = `<div class="toolbar"><form id="tf" class="toolbar" style="margin:0;flex:1"><input name="name" placeholder="Csapatnév" required minlength="2"><input name="country" placeholder="Ország (HU)" maxlength="3" style="width:130px"><button class="btn">＋ Csapat felvétele</button></form></div>
      <div class="grid team-cards">${state.teams.map((t, i) => {
        const r = state.standings.find((x) => x.teamId === t.id) || {};
        return `<div class="card tcard" style="animation-delay:${i * 60}ms">${avatar(t)}<h3>${esc(t.name)}</h3><p>${esc(t.country || '—')}</p>
          <div class="row"><span class="pill hot">${r.points || 0} pont</span><span class="pill">${r.wins || 0}Gy / ${r.losses || 0}V</span></div>
          <button class="btn danger sm" style="margin-top:14px" data-del-team="${t.id}">Törlés</button></div>`;
      }).join('') || '<div class="empty">Még nincs csapat</div>'}</div>`;
    $('#tf', el).onsubmit = async (e) => {
      e.preventDefault();
      try { await post('/api/teams', { name: e.target.name.value, country: e.target.country.value }); toast('Csapat hozzáadva'); await go(); }
      catch (x) { toast(x.message, true); }
    };
  },

  'new-match'(el) {
    if (state.teams.length < 2) { el.innerHTML = '<div class="card empty">Legalább két csapat kell a meccshez. <a href="#/teams" style="color:var(--accent)">Csapatok →</a></div>'; return; }
    const opts = state.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    let bo = 3;
    el.innerHTML = `<div class="card" style="max-width:760px"><h2>＋ Meccs rögzítése</h2>
      <div class="vs-row"><label class="field">Csapat 1<select id="t1">${opts}</select></label><div class="vs">VS</div><label class="field">Csapat 2<select id="t2">${opts}</select></label></div>
      <div style="margin:18px 0 4px"><div class="seg" id="bo"><button data-bo="1">BO1</button><button data-bo="3" class="on">BO3</button><button data-bo="5">BO5</button></div></div>
      <div id="rows"></div><div class="hint" id="hint"></div>
      <div style="margin-top:16px;display:flex;gap:10px"><button class="btn" id="save">Meccs mentése</button><button class="btn ghost" id="add">+ Pálya</button></div></div>`;
    $('#t2', el).selectedIndex = 1;
    const rows = $('#rows', el);
    const valid = (a, b) => { const w = Math.max(a, b), l = Math.min(a, b); if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false; if (w === 13) return l <= 11; return w >= 16 && w % 3 === 1 && w - l >= 2 && w - l <= 4; };
    const addRow = () => {
      const i = rows.children.length + 1;
      const d = document.createElement('div'); d.className = 'maprow';
      d.innerHTML = `<span>${i}. pálya</span><select>${MAPS.map((m) => `<option>${m}</option>`).join('')}</select><input type="number" min="0" placeholder="13"><span>:</span><input type="number" min="0" placeholder="9">`;
      d.querySelector('select').selectedIndex = (i - 1) % MAPS.length;
      d.querySelectorAll('input').forEach((x) => x.addEventListener('input', check));
      rows.append(d);
    };
    const read = () => [...rows.children].map((r) => { const [a, b] = r.querySelectorAll('input'); return { row: r, map: r.querySelector('select').value, score1: a.value === '' ? NaN : +a.value, score2: b.value === '' ? NaN : +b.value }; });
    function check() {
      let msg = '';
      read().forEach((m) => { const filled = !isNaN(m.score1) && !isNaN(m.score2); const bad = filled && !valid(m.score1, m.score2); m.row.classList.toggle('bad', bad); if (bad && !msg) msg = `${m.score1}-${m.score2} nem érvényes CS2 (MR12) eredmény`; });
      $('#hint').className = 'hint' + (msg ? ' err' : ''); $('#hint').textContent = msg || 'Tipp: 13-x (x ≤ 11), hosszabbításban 16-14, 19-17 …';
      return !msg;
    }
    const setBo = (n) => { bo = n; el.querySelectorAll('#bo button').forEach((b) => b.classList.toggle('on', +b.dataset.bo === n)); rows.innerHTML = ''; for (let i = 0; i < Math.ceil(n / 2); i++) addRow(); check(); };
    $('#bo', el).onclick = (e) => { if (e.target.dataset.bo) setBo(+e.target.dataset.bo); };
    $('#add', el).onclick = () => { if (rows.children.length < bo) addRow(); };
    $('#save', el).onclick = async () => {
      if (!check()) return;
      const maps = read().filter((m) => !isNaN(m.score1) && !isNaN(m.score2)).map(({ map, score1, score2 }) => ({ map, score1, score2 }));
      try { await post('/api/matches', { team1Id: +$('#t1').value, team2Id: +$('#t2').value, bestOf: bo, maps }); toast('Meccs rögzítve ✔'); location.hash = '#/standings'; }
      catch (x) { $('#hint').className = 'hint err'; $('#hint').textContent = x.message; toast(x.message, true); }
    };
    setBo(3);
  },
};

const titles = { dashboard: 'Dashboard', standings: 'Tabella', matches: 'Meccsek', teams: 'Csapatok', 'new-match': 'Új meccs' };

async function go() {
  const route = (location.hash.replace('#/', '') || 'dashboard');
  const name = views[route] ? route : 'dashboard';
  try { await refresh(); } catch (e) { toast(e.message, true); return; }
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
  $('#title').textContent = titles[name];
  const v = $('#view'); v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  views[name](v);
  $('#sidebar').classList.remove('open');
}

document.addEventListener('click', async (e) => {
  const dm = e.target.closest('[data-del-match]');
  if (dm && await confirmBox('Meccs törlése', 'Biztosan törlöd ezt a meccset? A tabella újraszámolódik.')) {
    try { await del('/api/matches/' + dm.dataset.delMatch); toast('Meccs törölve'); await go(); } catch (x) { toast(x.message, true); }
  }
  const dt = e.target.closest('[data-del-team]');
  if (dt && await confirmBox('Csapat törlése', 'Biztosan törlöd ezt a csapatot?')) {
    try { await del('/api/teams/' + dt.dataset.delTeam); toast('Csapat törölve'); await go(); } catch (x) { toast(x.message, true); }
  }
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#mc')?.click(); });
$('#menu').onclick = () => $('#sidebar').classList.toggle('open');
$('#theme').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; localStorage.setItem('theme', next);
};
document.documentElement.dataset.theme = localStorage.getItem('theme') || 'dark';
window.addEventListener('hashchange', go);

fetch('/health').then((r) => r.json()).then((h) => { $('#ver').textContent = 'v ' + String(h.version).slice(0, 7); }).catch(() => { $('#ver').textContent = 'offline'; });
go();
