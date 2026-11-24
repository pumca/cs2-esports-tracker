'use strict';
const { evaluateSeries } = require('./rules');
const { validateIcon } = require('./emblems');

// Egyszerű memóriabeli tár (a feladat hangsúlya a CI/CD, nem az adatbázis).
function createStore(seed = true) {
  const teams = [];
  const matches = [];
  let teamId = 1;
  let matchId = 1;

  function addTeam({ name, country, icon }) {
    if (typeof name !== 'string' || name.trim().length < 2) throw new Error('a csapatnév legalább 2 karakter');
    const n = name.trim();
    if (teams.some((t) => t.name.toLowerCase() === n.toLowerCase())) throw new Error('ilyen nevű csapat már létezik');
    const team = {
      id: teamId++, name: n,
      country: (country || '').toString().trim().toUpperCase().slice(0, 3),
      icon: validateIcon(icon),
    };
    teams.push(team);
    return team;
  }

  function updateTeam(id, { country, icon }) {
    const t = teams.find((x) => x.id === id);
    if (!t) throw new Error('ismeretlen csapat');
    if (icon !== undefined) t.icon = validateIcon(icon);
    if (country !== undefined) t.country = (country || '').toString().trim().toUpperCase().slice(0, 3);
    return t;
  }

  function addMatch({ team1Id, team2Id, bestOf = 3, maps }) {
    const t1 = teams.find((t) => t.id === team1Id);
    const t2 = teams.find((t) => t.id === team2Id);
    if (!t1 || !t2) throw new Error('ismeretlen csapat');
    if (t1.id === t2.id) throw new Error('egy csapat nem játszhat önmaga ellen');
    const res = evaluateSeries(bestOf, maps);
    const match = {
      id: matchId++, team1Id, team2Id, bestOf,
      maps: maps.map((m) => ({ map: m.map || '', score1: m.score1, score2: m.score2 })),
      winnerId: res.winner === 1 ? team1Id : team2Id,
      mapsWon1: res.maps1, mapsWon2: res.maps2,
    };
    matches.push(match);
    return match;
  }

  function standings() {
    const rows = new Map(teams.map((t) => [t.id, {
      teamId: t.id, team: t.name, played: 0, wins: 0, losses: 0,
      mapsWon: 0, mapsLost: 0, roundsWon: 0, roundsLost: 0, points: 0,
    }]));
    for (const m of matches) {
      const a = rows.get(m.team1Id);
      const b = rows.get(m.team2Id);
      a.played++; b.played++;
      a.mapsWon += m.mapsWon1; a.mapsLost += m.mapsWon2;
      b.mapsWon += m.mapsWon2; b.mapsLost += m.mapsWon1;
      for (const mp of m.maps) {
        a.roundsWon += mp.score1; a.roundsLost += mp.score2;
        b.roundsWon += mp.score2; b.roundsLost += mp.score1;
      }
      const win = m.winnerId === a.teamId ? a : b;
      const lose = win === a ? b : a;
      win.wins++; win.points += 3; lose.losses++;
    }
    return [...rows.values()]
      .sort((x, y) =>
        y.points - x.points ||
        (y.mapsWon - y.mapsLost) - (x.mapsWon - x.mapsLost) ||
        (y.roundsWon - y.roundsLost) - (x.roundsWon - x.roundsLost) ||
        x.team.localeCompare(y.team))
      .map((r, i) => ({ rank: i + 1, ...r }));
  }

  function deleteMatch(id) {
    const i = matches.findIndex((m) => m.id === id);
    if (i < 0) throw new Error('ismeretlen meccs');
    matches.splice(i, 1);
  }

  function deleteTeam(id) {
    const i = teams.findIndex((t) => t.id === id);
    if (i < 0) throw new Error('ismeretlen csapat');
    if (matches.some((m) => m.team1Id === id || m.team2Id === id)) {
      throw new Error('a csapatnak vannak meccsei, előbb azokat töröld');
    }
    teams.splice(i, 1);
  }

  function stats() {
    const mapCounts = {};
    let maps = 0;
    let rounds = 0;
    let overtimes = 0;
    for (const m of matches) {
      for (const mp of m.maps) {
        maps++;
        rounds += mp.score1 + mp.score2;
        if (Math.max(mp.score1, mp.score2) > 13) overtimes++;
        if (mp.map) mapCounts[mp.map] = (mapCounts[mp.map] || 0) + 1;
      }
    }
    return {
      teams: teams.length, matches: matches.length, maps, rounds, overtimes,
      avgRoundsPerMap: maps ? Math.round((rounds / maps) * 10) / 10 : 0,
      mapPopularity: Object.entries(mapCounts).map(([map, count]) => ({ map, count })).sort((a, b) => b.count - a.count),
    };
  }

  if (seed) {
    [
      ['NAVI', 'UA', 'bolt', 'shield', '#e8b923'],
      ['FaZe Clan', 'EU', 'claw', 'badge', '#d6343b'],
      ['G2 Esports', 'EU', 'eye', 'hex', '#2b2f38'],
      ['Vitality', 'FR', 'crown', 'circle', '#f0c419'],
      ['MOUZ', 'EU', 'mountain', 'diamond', '#c9272d'],
    ].forEach(([n, c, symbol, shape, color]) => addTeam({ name: n, country: c, icon: { shape, symbol, color } }));
    addMatch({ team1Id: 1, team2Id: 2, bestOf: 3, maps: [
      { map: 'Mirage', score1: 13, score2: 9 }, { map: 'Inferno', score1: 11, score2: 13 }, { map: 'Nuke', score1: 16, score2: 14 }] });
    addMatch({ team1Id: 4, team2Id: 3, bestOf: 3, maps: [
      { map: 'Ancient', score1: 13, score2: 5 }, { map: 'Anubis', score1: 13, score2: 10 }] });
    addMatch({ team1Id: 5, team2Id: 1, bestOf: 1, maps: [{ map: 'Dust2', score1: 13, score2: 11 }] });
  }

  return { teams, matches, addTeam, updateTeam, addMatch, deleteMatch, deleteTeam, standings, stats };
}

module.exports = { createStore };
