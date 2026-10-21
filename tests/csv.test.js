import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCSV } from '../client/lib/ui.js';
import { displayText } from '../client/lib/localization.js';

test('CSV keeps negative temperatures numeric, escapes notes and protects formula-like text', () => {
  const csv = serializeCSV([
    ['Zone', 'Soil Temperature (°C)', 'Notes', 'Recorded By'],
    [displayText('Участок A · Строительная площадка'), -12, 'Sample "A"; manual\nCovered ground', '=HYPERLINK("test")']
  ]);
  assert.ok(csv.startsWith('\ufeff"Zone";"Soil Temperature (°C)"'));
  assert.ok(csv.includes('"Zone A · Construction Site";"-12"'));
  assert.ok(csv.includes('"Sample ""A""; manual\nCovered ground"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""test"")"'));
});
