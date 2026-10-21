import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMeasurements } from '../server/services/analysis.js';

const now = new Date('2026-10-20T07:00:00Z');
const measurement = (values = {}) => ({ id: 1, moisture: 35, temperature: 12, ph: 6.8, measured_at: '2026-10-20T06:00:00Z', ...values });

test('missing observations produce an explained insufficient-data result', () => {
  const analysis = analyzeMeasurements([], now);
  assert.equal(analysis.status, 'insufficient_data');
  assert.equal(analysis.warnings[0].code, 'NO_DATA');
  assert.ok(analysis.warnings[0].explanation);
  assert.ok(analysis.warnings[0].recommendation);
});

test('a fresh observation within configured thresholds is normal', () => {
  assert.equal(analyzeMeasurements([measurement()], now).status, 'normal');
});

test('low moisture, pH, stale readings and changes all retain explanations', () => {
  const analysis = analyzeMeasurements([
    measurement({ id: 2, moisture: 10, ph: 8.5, temperature: 30, measured_at: '2026-10-15T06:00:00Z' }),
    measurement({ moisture: 40, temperature: 12, ph: 6.5, measured_at: '2026-10-14T06:00:00Z' })
  ], now);
  assert.equal(analysis.status, 'insufficient_data');
  for (const code of ['LOW_MOISTURE', 'PH_OUT_OF_RANGE', 'STALE_DATA', 'MOISTURE_CHANGE', 'TEMPERATURE_CHANGE', 'PH_CHANGE']) {
    const warning = analysis.warnings.find((warning) => warning.code === code);
    assert.ok(warning, code);
    for (const field of ['severity', 'title', 'actual', 'threshold', 'explanation', 'recommendation']) assert.notEqual(warning[field], undefined);
  }
});

test('high moisture warns and threshold boundaries remain inclusive', () => {
  assert.equal(analyzeMeasurements([measurement({ moisture: 80 })], now).warnings[0].code, 'HIGH_MOISTURE');
  assert.equal(analyzeMeasurements([measurement({ moisture: 20, ph: 5.5 })], now).warnings.length, 0);
});

test('analysis orders observations by time and does not mutate input', () => {
  const input = [measurement({ id: 1, moisture: 40, measured_at: '2026-10-19T06:00:00Z' }), measurement({ id: 2, moisture: 10 })];
  assert.equal(analyzeMeasurements(input, now).latest.id, 2);
  assert.equal(input[0].id, 1);
});
