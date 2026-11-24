'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validMapScore, evaluateSeries } = require('../src/rules');

test('érvényes rendes játékidős eredmények', () => {
  assert.ok(validMapScore(13, 0));
  assert.ok(validMapScore(11, 13));
  assert.ok(validMapScore(13, 11));
});

test('érvényes hosszabbításos eredmények', () => {
  assert.ok(validMapScore(16, 14));
  assert.ok(validMapScore(16, 12));
  assert.ok(validMapScore(19, 17));
  assert.ok(validMapScore(15, 19));
});

test('érvénytelen eredmények', () => {
  assert.equal(validMapScore(13, 12), false);
  assert.equal(validMapScore(14, 12), false);
  assert.equal(validMapScore(16, 15), false);
  assert.equal(validMapScore(10, 5), false);
  assert.equal(validMapScore(-1, 13), false);
  assert.equal(validMapScore(13.5, 2), false);
});

test('BO3 sorozat kiértékelése', () => {
  const r = evaluateSeries(3, [
    { score1: 13, score2: 9 }, { score1: 11, score2: 13 }, { score1: 13, score2: 7 }]);
  assert.deepEqual(r, { winner: 1, maps1: 2, maps2: 1 });
});

test('BO3 2-0 után felesleges pálya hibát ad', () => {
  assert.throws(() => evaluateSeries(3, [
    { score1: 13, score2: 9 }, { score1: 13, score2: 1 }, { score1: 13, score2: 7 }]), /eldőlt/);
});

test('befejezetlen sorozat hibát ad', () => {
  assert.throws(() => evaluateSeries(3, [{ score1: 13, score2: 9 }]), /nincs lejátszva/);
});

test('érvénytelen bestOf', () => {
  assert.throws(() => evaluateSeries(2, [{ score1: 13, score2: 9 }]), /bestOf/);
});
