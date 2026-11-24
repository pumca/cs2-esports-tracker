'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createStore } = require('../src/store');

async function withServer(store, fn) {
  const server = createApp(store).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}
const post = (url, body) => fetch(url, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('GET /health', async () => {
  await withServer(createStore(false), async (base) => {
    const r = await fetch(base + '/health');
    assert.equal(r.status, 200);
    assert.equal((await r.json()).status, 'ok');
  });
});

test('csapat létrehozása és duplikáció tiltása', async () => {
  await withServer(createStore(false), async (base) => {
    assert.equal((await post(base + '/api/teams', { name: 'Astralis', country: 'dk' })).status, 201);
    const dup = await post(base + '/api/teams', { name: 'astralis' });
    assert.equal(dup.status, 400);
    const teams = await (await fetch(base + '/api/teams')).json();
    assert.equal(teams[0].country, 'DK');
  });
});

test('meccs rögzítése és tabella', async () => {
  await withServer(createStore(false), async (base) => {
    await post(base + '/api/teams', { name: 'A-team' });
    await post(base + '/api/teams', { name: 'B-team' });
    const m = await post(base + '/api/matches', { team1Id: 1, team2Id: 2, bestOf: 1,
      maps: [{ map: 'Mirage', score1: 7, score2: 13 }] });
    assert.equal(m.status, 201);
    const st = await (await fetch(base + '/api/standings')).json();
    assert.equal(st[0].team, 'B-team');
    assert.equal(st[0].points, 3);
    assert.equal(st[1].losses, 1);
  });
});

test('érvénytelen meccs 400-at ad', async () => {
  await withServer(createStore(), async (base) => {
    const r = await post(base + '/api/matches', { team1Id: 1, team2Id: 2, bestOf: 1,
      maps: [{ score1: 10, score2: 5 }] });
    assert.equal(r.status, 400);
  });
});

test('csapatikon létrehozása, módosítása és validálása', async () => {
  await withServer(createStore(false), async (base) => {
    const ok = await post(base + '/api/teams', { name: 'Ikon FC', icon: { shape: 'hex', symbol: 'star', color: '#AA33CC' } });
    assert.equal(ok.status, 201);
    assert.equal((await ok.json()).icon.color, '#aa33cc');
    const bad = await post(base + '/api/teams', { name: 'Rossz FC', icon: { shape: 'nincs', symbol: 'star', color: '#aa33cc' } });
    assert.equal(bad.status, 400);
    const patch = await fetch(base + '/api/teams/1', { method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ icon: { shape: 'circle', symbol: 'bolt', color: '#112233' } }) });
    assert.equal(patch.status, 200);
    assert.equal((await patch.json()).icon.shape, 'circle');
    const badColor = await fetch(base + '/api/teams/1', { method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ icon: { shape: 'circle', symbol: 'bolt', color: 'red' } }) });
    assert.equal(badColor.status, 400);
  });
});

test('statisztikák a seed adatokból', async () => {
  await withServer(createStore(), async (base) => {
    const s = await (await fetch(base + '/api/stats')).json();
    assert.equal(s.teams, 5);
    assert.equal(s.matches, 3);
    assert.equal(s.maps, 6);
    assert.equal(s.overtimes, 1);
    assert.ok(s.mapPopularity.length > 0);
  });
});

test('meccs és csapat törlése', async () => {
  await withServer(createStore(), async (base) => {
    const blocked = await fetch(base + '/api/teams/1', { method: 'DELETE' });
    assert.equal(blocked.status, 400);
    assert.equal((await fetch(base + '/api/matches/1', { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(base + '/api/matches/1', { method: 'DELETE' })).status, 400);
    const left = await (await fetch(base + '/api/matches')).json();
    assert.equal(left.length, 2);
    assert.equal((await fetch(base + '/api/teams/2', { method: 'DELETE' })).status, 204);
  });
});

test('seed adatokkal a tabella rendezett', async () => {
  await withServer(createStore(), async (base) => {
    const st = await (await fetch(base + '/api/standings')).json();
    assert.equal(st.length, 5);
    for (let i = 1; i < st.length; i++) assert.ok(st[i - 1].points >= st[i].points);
  });
});
