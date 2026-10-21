import test from 'node:test';
import assert from 'node:assert/strict';
import { changedDateTime } from '../client/lib/forms.js';

test('metadata edits omit unchanged timestamps to preserve database precision', () => {
  const original = new Date(2026, 9, 19, 13, 17, 26, 665).toISOString();
  assert.equal(changedDateTime('2026-10-19T13:17', original), undefined);
});

test('a changed form date is saved as the selected local time', () => {
  const original = new Date(2026, 9, 19, 13, 17, 26, 665).toISOString();
  const expected = new Date(2026, 9, 19, 14, 30).toISOString();
  assert.equal(changedDateTime('2026-10-19T14:30', original), expected);
  assert.equal(changedDateTime('2026-10-19T14:30'), expected);
});
