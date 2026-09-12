import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { extractPage } from '../assets/site-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Explicit public roots: the internal sales portal is never crawled or indexed.
const paths = ['index.html', 'contact.html', 'our-team.html', 'portfolio.html'];
for (const folder of ['services', 'solutions']) {
  for (const name of (await readdir(resolve(root, folder))).sort()) {
    if (name.endsWith('.html')) paths.push(`${folder}/${name}`);
  }
}
const pages = [];
for (const path of paths) {
  const { document } = parseHTML(await readFile(resolve(root, path), 'utf8'));
  pages.push(extractPage(document, path));
}
const output = JSON.stringify({ version: 1, pages }, null, 2) + '\n';
const target = resolve(root, 'assets/site-knowledge.json');
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== output) throw new Error('Website content changed. Run npm run build:knowledge and commit the updated index.');
  console.log(`Knowledge matches all ${pages.length} public pages.`);
} else {
  await writeFile(target, output);
  console.log(`Indexed ${pages.length} public pages and ${pages.reduce((n, p) => n + p.faqs.length, 0)} FAQs.`);
}
