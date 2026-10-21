import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../server/db.js';

const command = process.argv[2] || 'init';
if (!['init', 'migrate', 'seed'].includes(command)) throw new Error('Use init, migrate or seed');
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(764291)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  if (command !== 'seed') {
    const directory = fileURLToPath(new URL('./migrations/', import.meta.url));
    for (const name of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) {
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
      if (existing.rowCount) continue;
      await client.query(await readFile(`${directory}/${name}`, 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      console.log(`Applied ${name}`);
    }
  }
  if (command !== 'migrate') {
    await client.query(await readFile(new URL('./seeds/demo.sql', import.meta.url), 'utf8'));
    console.log('Demo data initialized');
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
