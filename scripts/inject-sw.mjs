import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url);
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
}
const files = (await walk(root.pathname)).filter((file) => !file.endsWith('service-worker.js') && !file.endsWith('.map'));
const precache = files.map((file) => `/${relative(root.pathname, file).replaceAll('\\\\', '/')}`);
const swPath = join(root.pathname, 'service-worker.js');
let source = await readFile(swPath, 'utf8');
const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 10);
source = source.replace('__CACHE_VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache));
await writeFile(swPath, source);
