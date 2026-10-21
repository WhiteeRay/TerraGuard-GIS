import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementInput, zoneInput, activityInput, geometry, id, periodInput } from '../server/validation.js';
import { calculateVolume } from '../server/services/gis.js';

const validMeasurement = { moisture: 35, temperature: 12, ph: 6.8, measured_at: '2026-01-01T10:00:00+05:00', source: 'Ручное измерение' };
const polygon = { type: 'Polygon', coordinates: [[[71.4,51.1],[71.401,51.1],[71.401,51.101],[71.4,51.101],[71.4,51.1]]] };

test('volume converts centimeters to meters', () => {
  assert.equal(calculateVolume(10000, 30), 3000);
  assert.equal(calculateVolume(1500, 12.5), 187.5);
  assert.throws(() => calculateVolume(1000, 0));
  assert.throws(() => calculateVolume(NaN, 30));
});

test('measurement validation rejects missing, nonnumeric and out-of-range values', () => {
  assert.equal(measurementInput(validMeasurement).measured_at, '2026-01-01T05:00:00.000Z');
  for (const values of [{ moisture: 101 }, { moisture: -1 }, { ph: 15 }, { temperature: -61 }, { source: ' ' }, { moisture: '35' }, { ph: null }, { measured_at: '2099-01-01T00:00:00Z' }, { measured_at: '2026-01-01T10:00' }, { measured_at: '2026-02-30T10:00:00Z' }]) {
    assert.throws(() => measurementInput({ ...validMeasurement, ...values }), (error) => error.status === 422);
  }
  assert.throws(() => measurementInput({ ...validMeasurement, injected: true }));
});

test('GeoJSON validation enforces coordinate order, closed rings and polygon type', () => {
  assert.deepEqual(geometry(polygon), polygon);
  for (const invalid of [{ type: 'Point', coordinates: [71,51] }, { type: 'Polygon', coordinates: [[[71,51],[72,51],[72,52],[73,52]]] }, { type: 'Polygon', coordinates: [[[71,95],[72,51],[72,52],[71,95]]] }, null]) assert.throws(() => geometry(invalid));
});

test('zone updates require positive depth and reject unknown status or fields', () => {
  assert.equal(zoneInput({ name: ' Зона ', status: 'planned', topsoil_depth_cm: 30, geometry: polygon }).name, 'Зона');
  assert.deepEqual(zoneInput({ status: 'restored' }, true), { status: 'restored' });
  assert.throws(() => zoneInput({ topsoil_depth_cm: 0 }, true));
  assert.throws(() => zoneInput({ status: 'unknown' }, true));
  assert.throws(() => zoneInput({}, true));
  assert.throws(() => zoneInput({ project_id: 12 }, true));
});

test('activity planned and actual quantities are distinct nullable fields', () => {
  const result = activityInput({ zone_id: 1, type: 'storage', occurred_at: validMeasurement.measured_at, planned_volume_m3: 200, actual_volume_m3: null });
  assert.equal(result.planned_volume_m3, 200);
  assert.equal(result.actual_volume_m3, null);
  assert.throws(() => activityInput({ actual_volume_m3: -1 }, true));
  assert.throws(() => activityInput({ status: 'unknown' }, true));
});

test('identifiers and periods reject malformed values', () => {
  for (const invalid of ['1 OR 1=1', '-1', '1.5', '0', '2147483648', '9007199254740992']) assert.throws(() => id(invalid));
  assert.equal(id('12'), 12);
  assert.equal(periodInput({}), 14);
  assert.throws(() => periodInput({ days: 999 }));
});

test('zone metadata validates date-only values and supports clearing optional attributes', () => {
  assert.deepEqual(zoneInput({ soil_type: null, description: '', survey_date: '2026-01-01' }, true), { soil_type: null, description: null, survey_date: '2026-01-01' });
  for (const invalid of ['2026-02-30', '2026-13-01', '2099-01-01', 'not-a-date']) assert.throws(() => zoneInput({ survey_date: invalid }, true));
  assert.throws(() => zoneInput({ soil_type: 'a'.repeat(81) }, true));
});

test('measurement metadata keeps legacy source compatible and rejects conflicting aliases', () => {
  const metadata = measurementInput({ ...validMeasurement, sampling_depth_cm: 20, recorded_by: 'Field team', notes: 'Manual sample' });
  assert.equal(metadata.sampling_depth_cm, 20);
  assert.equal(metadata.recorded_by, 'Field team');
  assert.equal(measurementInput({ measurement_source: 'Manual sample' }, true).source, 'Manual sample');
  assert.deepEqual(measurementInput({ recorded_by: null, notes: '' }, true), { recorded_by: null, notes: null });
  for (const depth of [0, -1, 301, '20']) assert.throws(() => measurementInput({ sampling_depth_cm: depth }, true));
  assert.throws(() => measurementInput({ source: 'Manual', measurement_source: 'Sensor' }, true));
});

test('activity schedules and notes aliases remain optional and independent of work volumes', () => {
  const result = activityInput({ responsible_person: 'Field lead', planned_date: '2099-01-01', completed_date: null, notes: 'Scheduled work' }, true);
  assert.equal(result.note, 'Scheduled work');
  assert.equal(result.completed_date, null);
  assert.equal(result.planned_date, '2099-01-01');
  assert.throws(() => activityInput({ completed_date: '2099-01-01' }, true));
  assert.throws(() => activityInput({ note: 'One', notes: 'Two' }, true));
  assert.throws(() => activityInput({ responsible_person: 'a'.repeat(121) }, true));
});
