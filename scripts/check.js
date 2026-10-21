import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => entry.isDirectory() ? collect(`${directory}/${entry.name}`) : `${directory}/${entry.name}`));
  return paths.flat().filter((file) => file.endsWith('.js'));
}

for (const directory of ['client', 'server', 'database', 'scripts', 'tests']) {
  for (const file of await collect(directory)) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status) process.exit(result.status);
  }
}
console.log('JavaScript syntax verified');
