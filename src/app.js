'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const { createStore } = require('./store');
const { SHAPES, SYMBOLS } = require('./emblems');

function createApp(store = createStore()) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => res.json({
    status: 'ok',
    version: process.env.APP_VERSION || 'dev',
    uptime: Math.round(process.uptime()),
  }));

  app.get('/api/teams', (req, res) => res.json(store.teams));
  app.post('/api/teams', (req, res) => {
    try { res.status(201).json(store.addTeam(req.body || {})); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/matches', (req, res) => res.json(store.matches));
  app.post('/api/matches', (req, res) => {
    try { res.status(201).json(store.addMatch(req.body || {})); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.patch('/api/teams/:id', (req, res) => {
    try { res.json(store.updateTeam(Number(req.params.id), req.body || {})); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  app.get('/api/emblems', (req, res) => res.json({ shapes: SHAPES, symbols: SYMBOLS }));
  app.get('/api/logos', (req, res) => {
    let files = [];
    try { files = fs.readdirSync(path.join(__dirname, '..', 'public', 'logos')); } catch (e) { /* nincs mappa */ }
    res.json(files.filter((f) => /^[a-z0-9_-]+\.(svg|png|webp)$/.test(f)).sort().map((f) => '/logos/' + f));
  });
  app.delete('/api/teams/:id', (req, res) => {
    try { store.deleteTeam(Number(req.params.id)); res.status(204).end(); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  app.delete('/api/matches/:id', (req, res) => {
    try { store.deleteMatch(Number(req.params.id)); res.status(204).end(); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/standings', (req, res) => res.json(store.standings()));
  app.get('/api/stats', (req, res) => res.json(store.stats()));

  return app;
}

module.exports = { createApp };
