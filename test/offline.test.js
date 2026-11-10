const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const CHROME = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].find(p => p && fs.existsSync(p));

const OLD_HTML = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>old</title></head><body>
<div id="mark">UPPER_ONLY_143</div>
<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");</script>
</body></html>`;

const OLD_SW = `const CACHE='hanmadi-v293';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(res=>{
    const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request, copy)); return res;
  }).catch(()=>caches.match(e.request)));
});`;

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

function startServer() {
  let mode = 'old';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.end(mode === 'old' ? OLD_SW : fs.readFileSync(path.join(root, 'sw.js')));
      return;
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(mode === 'old' ? OLD_HTML : fs.readFileSync(path.join(root, 'index.html')));
      return;
    }
    const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.statusCode = 404;
      res.end('missing');
      return;
    }
    res.setHeader('Content-Type', contentType(file));
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve({
      server,
      port: server.address().port,
      setMode(next) { mode = next; }
    }));
  });
}

async function waitFor(page, fn, message) {
  try {
    await page.waitForFunction(fn, { timeout: 20000 });
  } catch (err) {
    const state = await page.evaluate(async () => ({
      controlled: !!navigator.serviceWorker.controller,
      keys: await caches.keys(),
      text: document.body.innerText.slice(0, 200)
    })).catch(() => null);
    throw new Error(message + ' ' + JSON.stringify(state) + ' ' + err.message);
  }
}

test('offline cache replaces the previous corpus and shows 海味不鹹', { timeout: 120000 }, async (t) => {
  if (!CHROME) {
    assert.fail('Chrome is required for the service-worker test');
  }
  const puppeteer = require('puppeteer-core');
  const { server, port, setMode } = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${port}/`;
  await page.goto(base, { waitUntil: 'networkidle0' });
  await waitFor(page, () => navigator.serviceWorker.controller, 'old controller');
  await page.waitForFunction(async () => (await caches.keys()).includes('hanmadi-v293'));
  assert.match(await page.$eval('#mark', el => el.textContent), /UPPER_ONLY_143/);

  setMode('new');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (worker) worker.addEventListener('statechange', () => {});
    });
    await reg.update();
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await waitFor(page, async () => {
    const keys = await caches.keys();
    return keys.includes('hanmadi-cg356') && !keys.includes('hanmadi-v293') && document.body.innerText.includes('채근담 356');
  }, 'updated cache');

  await page.goto(base + 'index.html#2027-03-24', { waitUntil: 'networkidle0' });
  assert.match(await page.$eval('#date', el => el.textContent), /2027년 3월 24일/);
  let body = await page.$eval('#cards', el => el.innerText);
  assert.match(body, /花看半開/);
  assert.doesNotMatch(body, /海味不鹹/);
  assert.match(body, /140 \/ 356/);

  await page.click('#next');
  await page.waitForFunction(() => location.hash === '#2027-03-25');
  assert.match(await page.$eval('#date', el => el.textContent), /2027년 3월 25일/);
  body = await page.$eval('#cards', el => el.innerText);
  assert.match(body, /전집 제84장\(前集 第84\)/);
  assert.match(body, /清能有容，仁能善斷；明不傷察，直不過矯。是謂蜜餞不甜，海味不鹹，纔是懿德。/);
  assert.match(body, /청능유용, 인능선단; 명불상찰, 직불과교\. 시위밀전불첨, 해미불함, 재시의덕\./);
  assert.match(body, /바닷가 음식이 짜지 않은/);
  assert.match(body, /141 \/ 356/);
  const foot = await page.$eval('#foot', el => el.innerText);
  assert.match(foot, /시작일 2026-11-05/);
  assert.match(foot, /같은 날짜는 언제나 같은 구절/);
  assert.match(foot, /채근담 356/);

  const first = await page.$eval('#cards', el => el.innerText);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('#cards', el => el.innerText), first);

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  body = await page.$eval('#cards', el => el.innerText);
  assert.match(body, /海味不鹹/);
  assert.match(body, /전집 제84장\(前集 第84\)/);
  assert.match(body, /141 \/ 356/);
  assert.match(await page.$eval('#foot', el => el.innerText), /채근담 356/);
  const keys = await page.evaluate(async () => await caches.keys());
  assert.deepEqual(keys, ['hanmadi-cg356']);
});
