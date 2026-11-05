const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fixturePath = path.join(__dirname, 'fixtures', 'zg-lower-150.json');
const fixtureText = fs.readFileSync(fixturePath);
const fixture = JSON.parse(fixtureText);

const UPPER_SHA = {
  mx: '40f5a9ab49167749b553cc416ae64b47712b8d4662ece02e9ddc7b31b01a514a',
  cg: 'cb2fbc14465f49c0333f6d1240afed816c74776173ee3e8cbb57e6fde258d1bf',
  zg: '00c98bebac7da51d80e28831f05f993b9d8720caae7077c53ce55e8e88d0c7a6',
  w: '604ee83533e7a86bcbb32b55f1ca5462a2d0853800abc568daffa979de114d8a'
};
const FOOT = "document.getElementById('foot').innerHTML=`명심보감 ${D.mx.length} · 채근담 ${D.cg.length} · 증광현문 ${D.zg.length} · 서양 ${D.w.length}구절<br>원문은 옛 공개 판본(위키문헌 明心寶鑑·菜根譚 明刻本·增廣昔時賢文, George Long 역 『명상록』, 프랭클린 원문, KJV 잠언)에서, 음과 풀이는 새로 썼습니다.<br>시작일 2026-11-05 · 같은 날짜는 언제나 같은 구절`;";
const REQUIRED = ['o', 'e', 'p', 'c', 'src', 'local', 'source', 'source_index_in_zg_all', 'lower_collection_no'];

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }
function lcm(a, b) { return Math.abs(a / gcd(a, b) * b); }

function loadData(source) {
  const m = source.match(/const D=(\{.*?\});\nconst START/s);
  assert.ok(m, 'embedded corpus');
  return JSON.parse(m[1]);
}
function loadFns(source) {
  const start = source.indexOf('const START=');
  const end = source.indexOf('function eastCard');
  assert.ok(start > 0 && end > start);
  return new Function(source.slice(start, end) + '\nreturn {START, dayIndex, mod, shift};')();
}
function loadCards(source) {
  const start = source.indexOf('function esc(');
  const end = source.indexOf('const MEMO');
  return new Function(source.slice(start, end) + '\nreturn {eastCard};')();
}

const D = loadData(html);
const { START, dayIndex, mod, shift } = loadFns(html);
const { eastCard } = loadCards(html);
const upper = D.zg.slice(0, 143);
const lower = D.zg.slice(143);

function pick(y, m, d) {
  const n = dayIndex(y, m, d);
  return {
    n,
    mx: mod(n, D.mx.length),
    cg: mod(n, D.cg.length),
    zg: mod(n, D.zg.length),
    w: mod(n, D.w.length)
  };
}

test('fixture is the reviewed lower collection', () => {
  assert.equal(sha256(fixtureText).slice(0, 16), '32cc7c0fb916d4c6');
  assert.equal(fixture.length, 150);
});

test('lengths, epoch, and unchanged upper and other books', () => {
  assert.deepEqual(START, [2026, 11, 5]);
  assert.equal(D.start, '2026-11-05');
  assert.equal(D.mx.length, 151);
  assert.equal(D.cg.length, 140);
  assert.equal(D.zg.length, 293);
  assert.equal(D.w.length, 141);
  assert.equal(sha256(JSON.stringify(D.mx)), UPPER_SHA.mx);
  assert.equal(sha256(JSON.stringify(D.cg)), UPPER_SHA.cg);
  assert.equal(sha256(JSON.stringify(upper)), UPPER_SHA.zg);
  assert.equal(sha256(JSON.stringify(D.w)), UPPER_SHA.w);
  assert.ok(upper.every(x => x.c === '상집(上集)'));
  const books = {};
  for (const x of D.w) books[x.b] = (books[x.b] || 0) + 1;
  assert.deepEqual(books, { '명상록': 47, '가난한 리처드의 달력': 47, '잠언': 47 });
  assert.ok(html.includes(FOOT));
});

test('lower collection is appended whole, by src, with metadata kept', () => {
  assert.equal(JSON.stringify(lower), JSON.stringify(fixture));
  assert.equal(lower.length, 150);
  for (let i = 1; i < lower.length; i++) assert.ok(lower[i].src > lower[i - 1].src);
  const allowed = new Set([...REQUIRED, 'src_all', 'lower_collection_nos']);
  const joined = [];
  for (const x of lower) {
    for (const key of REQUIRED) assert.ok(x[key] !== undefined && x[key] !== '', key);
    for (const key of Object.keys(x)) assert.ok(allowed.has(key), key);
    assert.equal(x.c, '하집(下集)');
    assert.equal(x.source, 'zh.wikisource.org 增廣昔時賢文 下集');
    assert.equal(x.local, x.lower_collection_no);
    assert.equal(x.source_index_in_zg_all, x.src);
    assert.equal(x.lower_collection_no, x.src - 434);
    if (x.src_all || x.lower_collection_nos) {
      joined.push(x);
      assert.deepEqual(x.src_all, [x.src, x.src + 1]);
      assert.deepEqual(x.lower_collection_nos, [x.lower_collection_no, x.lower_collection_no + 1]);
    }
  }
  assert.equal(joined.length, 8);
  assert.deepEqual(joined.map(x => x.src_all.join('+')), [
    '463+464', '471+472', '474+475', '480+481', '515+516', '685+686', '735+736', '748+749'
  ]);
});

test('originals do not duplicate the upper collection or the other books', () => {
  const seen = new Set();
  for (const x of D.zg) {
    assert.equal(seen.has(x.o), false);
    seen.add(x.o);
  }
  const mx = new Set(D.mx.map(x => x.o));
  const cg = new Set(D.cg.map(x => x.o));
  for (const x of lower) {
    assert.equal(mx.has(x.o), false);
    assert.equal(cg.has(x.o), false);
  }
});

test('source labels and passage fields render for a lower entry', () => {
  const card = eastCard('증광현문', '增廣賢文', D.zg, 143);
  const x = D.zg[143];
  assert.match(card, /class="card zg"/);
  assert.match(card, /증광현문/);
  assert.ok(card.includes(x.c));
  assert.ok(card.includes('하집(下集)'));
  assert.ok(card.includes(x.o));
  assert.ok(card.includes(x.e));
  assert.ok(card.includes(x.p));
  assert.match(card, />144 \/ 293</);
  const upperCard = eastCard('증광현문', '增廣賢文', D.zg, 0);
  assert.ok(upperCard.includes('상집(上集)'));
  assert.ok(upperCard.includes(D.zg[0].o));
});

test('same day is deterministic and the next year does not reset', () => {
  const samples = [[2026, 11, 5], [2026, 12, 31], [2027, 1, 1], [2027, 3, 27], [2027, 3, 28], [2027, 11, 5], [2028, 2, 29], [2028, 11, 5]];
  for (const ymd of samples) {
    assert.deepEqual(pick(...ymd), pick(...ymd));
    assert.equal(dayIndex(...ymd), dayIndex(...ymd));
  }
  assert.equal(pick(2026, 11, 5).n, 0);
  assert.equal(pick(2027, 11, 5).n, 365);
  assert.notEqual(pick(2027, 11, 5).n, 0);
  assert.notEqual(pick(2028, 11, 5).n, 0);
  assert.equal(365 % 143, 79);
  assert.deepEqual(pick(2027, 11, 5), { n: 365, mx: 63, cg: 85, zg: 72, w: 83 });
  assert.notEqual(pick(2027, 11, 5).zg, 0);
  assert.equal(D.zg[72].c, '상집(上集)');
});

test('dates before 2027-03-28 keep the old 증광현문 pick; the first lower passage is 2027-03-28', () => {
  for (let n = 0; n <= 142; n++) {
    assert.equal(n % 293, n % 143);
    assert.equal(mod(n, 293), n);
  }
  assert.equal(pick(2027, 3, 27).n, 142);
  assert.equal(pick(2027, 3, 27).zg, 142);
  assert.equal(D.zg[142].c, '상집(上集)');
  assert.equal(pick(2027, 3, 28).n, 143);
  assert.equal(pick(2027, 3, 28).zg, 143);
  assert.equal(143 % 143, 0);
  assert.notEqual(pick(2027, 3, 28).zg, 143 % 143);
  assert.equal(D.zg[143].c, '하집(下集)');
  assert.equal(pick(2027, 3, 28).mx, 143 % 151);
  assert.equal(pick(2027, 3, 28).cg, 143 % 140);
  assert.equal(pick(2027, 3, 28).w, 143 % 141);
  const later = pick(2027, 3, 28);
  assert.deepEqual(shift([2027, 3, 27], 1), [2027, 3, 28]);
  assert.equal(dayIndex(...shift([2026, 11, 5], later.n)), later.n);
});

test('year and leap-day boundaries stay on the continuous day count', () => {
  assert.deepEqual(shift([2026, 12, 31], 1), [2027, 1, 1]);
  assert.equal(dayIndex(2027, 1, 1), dayIndex(2026, 12, 31) + 1);
  assert.notEqual(dayIndex(2027, 1, 1), 0);
  assert.equal(dayIndex(2028, 2, 29), dayIndex(2028, 2, 28) + 1);
  assert.equal(dayIndex(2028, 3, 1), dayIndex(2028, 2, 29) + 1);
  assert.deepEqual(shift([2028, 2, 28], 1), [2028, 2, 29]);
  assert.deepEqual(shift([2028, 2, 29], 1), [2028, 3, 1]);
  assert.equal(dayIndex(2027, 3, 1), dayIndex(2027, 2, 28) + 1);
  assert.equal(pick(2028, 2, 28).n + 1, pick(2028, 2, 29).n);
  assert.equal(pick(2028, 2, 29).n + 1, pick(2028, 3, 1).n);
});

test('full cycle is the LCM of 151, 140, 293, and 141', () => {
  const lens = [D.mx.length, D.cg.length, D.zg.length, D.w.length];
  assert.deepEqual(lens, [151, 140, 293, 141]);
  for (let i = 0; i < lens.length; i++) {
    for (let j = i + 1; j < lens.length; j++) assert.equal(gcd(lens[i], lens[j]), 1);
  }
  assert.equal(lens.reduce(lcm), 873356820);
  const cycle = 873356820;
  assert.deepEqual(pick(2026, 11, 5), { n: 0, mx: 0, cg: 0, zg: 0, w: 0 });
  assert.equal(mod(cycle, 151), 0);
  assert.equal(mod(cycle, 140), 0);
  assert.equal(mod(cycle, 293), 0);
  assert.equal(mod(cycle, 141), 0);
  assert.notEqual(mod(cycle - 1, 293), 0);
});

test('every lower passage is reachable on the rotation', () => {
  for (let i = 143; i < 293; i++) {
    assert.equal(mod(i, D.zg.length), i);
    assert.equal(D.zg[i].c, '하집(下集)');
  }
});

test('service worker caches only the current corpus version', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /const CACHE = 'hanmadi-v293'/);
  assert.match(sw, /caches\.delete\(key\)/);
  assert.match(sw, /cache\.match\(request\)/);
  assert.equal(sw.includes('caches.match('), false);
  assert.match(sw, /response\.ok/);
  assert.match(sw, /self\.skipWaiting\(\)/);
});
