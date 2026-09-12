import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const { pages } = JSON.parse(await readFile(resolve(root, 'assets/site-knowledge.json'), 'utf8'));
const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/CREAIVA\//, '');
    if (!path || path.endsWith('/')) path += 'index.html';
    const target = resolve(root, path);
    if (!target.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'text/plain' }); res.end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.CREAIVA_TEST_URL || `http://127.0.0.1:${server.address().port}/CREAIVA/`;
const browser = await chromium.launch({ headless: true, ...(process.env.CREAIVA_BROWSER_CHANNEL ? { channel: process.env.CREAIVA_BROWSER_CHANNEL } : {}) });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, {width: 320, height: 740}]) {
    await page.setViewportSize(viewport);
    for (const item of pages) {
      await page.goto(new URL(item.path, base).href, { waitUntil: 'domcontentloaded' });
      await page.locator('.ca-launch').waitFor();
      assert.equal(await page.locator('.ca-launch').count(), 1, item.path);
      assert.equal(await page.locator('dialog[open]').count(), 0, item.path);
      if (item.category !== 'company') {
        await page.waitForFunction(() => document.querySelector('.page-hero-media img')?.naturalWidth > 0);
        const geometry = await page.evaluate(() => {
          const hero = document.querySelector('.page-hero');
          const h = hero.getBoundingClientRect();
          const image = hero.querySelector('img').getBoundingClientRect();
          const content = hero.querySelector('.page-hero-content').getBoundingClientRect();
          return { width: h.width, imageWidth: image.width, height: h.height, imageHeight: image.height,
            headingCount: hero.querySelectorAll('h1').length, contentBottom: content.bottom, heroBottom: h.bottom,
            contentWidth: content.width, overlay: getComputedStyle(hero, '::before').backgroundImage,
            objectFit: getComputedStyle(hero.querySelector('img')).objectFit };
        });
        assert.equal(geometry.headingCount, 1, item.path);
        assert.equal(geometry.width, viewport.width, item.path);
        assert.equal(geometry.width, geometry.imageWidth, item.path);
        assert.equal(geometry.height, geometry.imageHeight, item.path);
        assert.equal(geometry.objectFit, 'cover', item.path);
        assert.match(geometry.overlay, /linear-gradient/, item.path);
        assert.ok(geometry.contentBottom < geometry.heroBottom, item.path);
        assert.ok(geometry.contentWidth <= viewport.width, item.path);
      }
    }
    console.log(`Checked all ${pages.length} pages at ${viewport.width}px.`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('services/website-design.html',base).href);
  await page.getByRole('button',{name:'Ask CREAIVA',exact:true}).click();
  await page.getByRole('button',{name:'What’s included?',exact:true}).click();
  await page.getByText('Website Design includes:',{exact:false}).waitFor();
  assert.match(await page.locator('.ca-sources a').last().getAttribute('href'), /\/CREAIVA\/services\/website-design.html/);
  const input = page.getByRole('textbox',{name:'Ask about CREAIVA'});
  await input.fill('Which platforms do you build on?');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.getByRole('log').getByText('Webflow, Framer, and headless',{exact:false}).waitFor();
  await input.fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.getByText("I couldn't confirm that detail",{exact:false}).waitFor();
  assert.equal(await page.locator('.ca-messages img').count(),0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(await page.locator('.ca-launch').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('.ca-launch').evaluate(el=>el===document.activeElement),true);
  // A failed index request must show contact help, then allow a successful retry.
  await page.goto(new URL('index.html',base).href);
  await page.route('**/site-knowledge.json', route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.getByRole('button',{name:'Ask CREAIVA',exact:true}).click();
  await page.getByRole('button',{name:'Our services',exact:true}).click();
  await page.getByText('I couldn’t load the website information just now.',{exact:false}).waitFor();
  await page.unroute('**/site-knowledge.json');
  await page.getByRole('button',{name:'Our services',exact:true}).click();
  await page.getByText('CREAIVA offers 14 services.',{exact:false}).waitFor();
  assert.equal(await page.locator('.ca-message').last().locator('.ca-sources a').count(),15);
  assert.deepEqual(errors,[]);
  await mkdir(resolve(root,'test-results'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/assistant-mobile.png')});
  await page.keyboard.press('Escape');
  await page.goto(new URL('solutions/brand-launch-package.html',base).href);
  await page.screenshot({path:resolve(root,'test-results/solution-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(new URL('services/website-design.html',base).href);
  await page.screenshot({path:resolve(root,'test-results/service-desktop.png')});
  console.log('Chat, nested source links, follow-ups, keyboard access, safe text rendering, and error recovery passed.');
} finally { await browser.close(); server.close(); }
