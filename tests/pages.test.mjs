import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
const root = new URL('../', import.meta.url);
const knowledge = JSON.parse(await readFile(new URL('assets/site-knowledge.json',root),'utf8'));
for (const page of knowledge.pages) test(`public page assets and links: ${page.path}`, async () => {
  const url = new URL(page.path,root);
  const html = await readFile(url,'utf8');
  const {document} = parseHTML(html);
  assert.equal(document.querySelectorAll('script[src$="assets/assistant.mjs"]').length,1);
  assert.equal(document.querySelectorAll('link[href$="assets/assistant.css"]').length,1);
  assert.ok(!html.includes('function aiReply('));
  if (page.category === 'company') return;
  const hero = document.querySelector('.page-hero--immersive');
  assert.ok(hero);
  assert.equal(hero.querySelectorAll('h1').length,1);
  assert.equal(hero.querySelectorAll('.about-visual').length,0);
  await access(new URL(hero.querySelector('.page-hero-media img').getAttribute('src'),url));
  for (const a of hero.querySelectorAll('a')) {
    const target = new URL(a.getAttribute('href'),url);
    const {document:targetDocument} = parseHTML(await readFile(target,'utf8'));
    if (target.hash) assert.ok(targetDocument.getElementById(target.hash.slice(1)),`${page.path}: ${a.getAttribute('href')}`);
  }
});
test('internal sales page does not load the assistant', async () => {
  assert.ok(!(await readFile(new URL('sales-pricing.html',root),'utf8')).includes('assets/assistant'));
});
test('contact summary is actual contact copy, not a breadcrumb', () => {
  assert.match(knowledge.pages.find(p=>p.path==='contact.html').summary,/24 hours/);
});
