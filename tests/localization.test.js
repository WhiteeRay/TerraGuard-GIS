import test from 'node:test';
import assert from 'node:assert/strict';
import { displayText, preserveOriginal } from '../client/lib/localization.js';

test('known legacy demo labels display in English without changing stored values', () => {
  const original = 'Участок A · Строительная площадка';
  assert.equal(displayText(original), 'Zone A · Construction Site');
  assert.equal(preserveOriginal(displayText(original), original), original);
  assert.equal(preserveOriginal('New zone name', original), 'New zone name');
  assert.equal(displayText('User supplied name'), 'User supplied name');
});
