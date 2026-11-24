const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dir = path.join(root, 'data', 'themes');
const bundled = JSON.parse(fs.readFileSync(path.join(root, 'data', 'themes.json'), 'utf8'));

function themeFiles() {
  return fs.readdirSync(dir).filter(n => n.endsWith('.json') && !n.startsWith('_'));
}

function loadThemesFromHtml() {
  const start = html.indexOf('/* THEMES-BEGIN */');
  const end = html.indexOf('/* THEMES-END */');
  assert.ok(start >= 0 && end > start, 'THEME markers');
  return new Function(html.slice(start, end) + '/* THEMES-END */\nreturn {THEME_START, THEMES};')();
}

function loadThemeFns() {
  const start = html.indexOf('function themeStartYMD');
  const end = html.indexOf('function render(ymd)');
  assert.ok(start > 0 && end > start, 'theme runtime');
  const prelude = html.slice(html.indexOf('/* THEMES-BEGIN */'), html.indexOf('/* THEMES-END */') + '/* THEMES-END */'.length);
  const helpers = 'function esc(s){return String(s);}\nfunction todayYMD(){return [2026,11,21];}\n';
  return new Function(prelude + helpers + html.slice(start, end) + '\nreturn {THEME_START,THEMES,themeStartYMD,themeDayIndex,themeSinceDay,themesForDay,orderedItems,findTheme,themeIndexHtml,themeCard,themeKindInfo,themeItemHtml};')();
}

test('every theme file is in the bundle and in the page', () => {
  const files = themeFiles();
  assert.ok(files.length >= 2);
  const { THEME_START, THEMES } = loadThemesFromHtml();
  assert.equal(THEME_START, bundled.start);
  assert.equal(THEMES.length, bundled.themes.length);
  assert.equal(THEMES.length, files.length);
  const ids = THEMES.map(t => t.id).sort();
  const fileIds = files.map(n => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')).id).sort();
  assert.deepEqual(ids, fileIds);
  assert.deepEqual(ids, bundled.themes.map(t => t.id).slice().sort());
});

test('required sample themes exist with 원문 풀이 출처', () => {
  const { THEMES } = loadThemesFromHtml();
  const need = ['innae', 'maljosim', 'jinansil', 'hansali', 'yojigyeong'];
  for (const id of need) {
    const t = THEMES.find(x => x.id === id);
    assert.ok(t, id);
    assert.ok(t.items.length >= 2, id + ' items');
    for (const it of t.items) {
      assert.ok(it.o && it.p && it.source, id + ' o/p/source');
    }
  }
  const innae = THEMES.find(t => t.id === 'innae');
  assert.equal(innae.title, '인내');
  assert.ok(innae.items.some(i => i.o.includes('忍一句')));
  const mal = THEMES.find(t => t.id === 'maljosim');
  assert.equal(mal.title, '말조심');
  assert.ok(mal.items.some(i => i.o.includes('禍從口出')));
  const jung = THEMES.find(t => t.id === 'hansali');
  assert.ok(jung.items[0].o.includes('仲'));
  assert.ok(jung.items[0].p.includes('버금') || jung.items[0].e.includes('버금'));
  assert.equal(jung.items[0].p.includes('개그'), false);
  const yoji = THEMES.find(t => t.id === 'yojigyeong');
  assert.ok(yoji.items.some(i => i.o.includes('Anything that can go wrong')));
  assert.ok(yoji.items.some(i => i.o.includes('Work expands so as to fill the time')));
  assert.ok(yoji.items.some(i => i.o.includes('peak-hour traffic congestion rises to meet maximum capacity')));
});

test('proverb slots stay at the end, at most one each', () => {
  const { orderedItems, THEMES } = loadThemeFns();
  for (const t of THEMES) {
    const items = orderedItems(t);
    const kinds = items.map(i => i.kind);
    const ko = kinds.filter(k => k === 'proverb_ko').length;
    const en = kinds.filter(k => k === 'proverb_en').length;
    assert.ok(ko <= 1, t.id + ' ko');
    assert.ok(en <= 1, t.id + ' en');
    const last = kinds.slice(-(ko + en));
    if (ko && en) assert.deepEqual(last, ['proverb_ko', 'proverb_en']);
    else if (ko) assert.equal(last[last.length - 1], 'proverb_ko');
    else if (en) assert.equal(last[last.length - 1], 'proverb_en');
    const rest = kinds.slice(0, kinds.length - ko - en);
    assert.equal(rest.includes('proverb_ko'), false);
    assert.equal(rest.includes('proverb_en'), false);
  }
});

test('rotation starts on config date, no mid-cycle reshuffle', () => {
  const { themeDayIndex, themeSinceDay, themesForDay, THEMES, THEME_START } = loadThemeFns();
  const [sy, sm, sd] = THEME_START.split('-').map(Number);
  assert.equal(themeDayIndex(sy, sm, sd), 0);
  const day0 = themesForDay(0, THEMES);
  const atStart = THEMES.filter(t => themeSinceDay(t) <= 0).sort((a, b) => (a.order - b.order) || String(a.id).localeCompare(b.id));
  assert.equal(day0.theme.id, atStart[0].id);
  const n = atStart.length;
  const ids = [];
  for (let i = 0; i < n; i++) {
    const r = themesForDay(i, THEMES);
    assert.equal(r.list.length, n);
    ids.push(r.theme.id);
  }
  assert.equal(new Set(ids).size, n);
  const second = themesForDay(n, THEMES);
  assert.equal(second.theme.id, ids[0]);
  assert.equal(second.list.length, THEMES.length);
  assert.equal(themesForDay(0, THEMES).list.some(t => t.id === 'ujeonguiri'), false);
  assert.ok(second.list.some(t => t.id === 'ujeonguiri'));
  assert.equal(themesForDay(n + n, THEMES).theme.id, 'ujeonguiri');
  assert.equal(themesForDay(0, THEMES).list.some(t => t.id === 'jeonjaengpyeonghwa'), false);
  assert.ok(second.list.some(t => t.id === 'jeonjaengpyeonghwa'));
  assert.equal(themesForDay(n + n + 1, THEMES).theme.id, 'jeonjaengpyeonghwa');
  // a late-added theme waits for the next cycle
  const extra = { id: 'extra-test', title: '추가', order: 99, since: `${sy}-${String(sm).padStart(2, '0')}-${String(sd + 1).padStart(2, '0')}`, items: [{ o: 'x', p: 'y', source: 'z' }] };
  // since = start+1, if start is day 0, since day is 1, still mid first cycle
  const mixed = THEMES.concat([extra]);
  assert.equal(themesForDay(0, mixed).theme.id, ids[0]);
  assert.equal(themesForDay(1, mixed).list.some(t => t.id === 'extra-test'), false);
  const after = themesForDay(n, mixed);
  assert.ok(after.list.some(t => t.id === 'extra-test'));
  assert.equal(after.list.length, THEMES.length + 1);
  // days before start have no theme
  const before = new Date(Date.UTC(sy, sm - 1, sd - 1));
  assert.ok(themeDayIndex(before.getUTCFullYear(), before.getUTCMonth() + 1, before.getUTCDate()) < 0);
  assert.equal(themesForDay(-1, THEMES).theme, null);
});

test('index html lists every theme id for #theme/ links', () => {
  const { themeIndexHtml, THEMES, findTheme, themeCard } = loadThemeFns();
  const idx = themeIndexHtml();
  for (const t of THEMES) {
    assert.ok(idx.includes('#theme/' + t.id), t.id + ' in toc');
    assert.ok(idx.includes(t.title), t.title);
    assert.equal(findTheme(t.id).id, t.id);
    const card = themeCard(t, { caption: 'x' });
    assert.ok(card.includes(t.title));
    assert.ok(card.includes(t.items[0].o.slice(0, 8)) || card.includes('오늘의 주제'));
  }
});

test('existing footer text is unchanged', () => {
  const FOOT = "document.getElementById('foot').innerHTML=`명심보감 ${D.mx.length} · 채근담 ${D.cg.length} · 증광현문 ${D.zg.length} · 서양 ${D.w.length}구절<br>원문은 옛 공개 판본(위키문헌 明心寶鑑·菜根譚 明刻本·增廣昔時賢文, George Long 역 『명상록』, 프랭클린 원문, KJV 잠언)에서, 음과 풀이는 새로 썼습니다. 영어 구절은 이 공개 판본의 옛 말투(thou·thy·-eth)만 오늘 영어로 고쳤습니다.<br>시작일 2026-11-05 · 같은 날짜는 언제나 같은 구절`;";
  assert.ok(html.includes(FOOT));
});

test('day page keeps four books and only a jump to the theme-day view', () => {
  const renderSrc = html.slice(html.indexOf('function render(ymd)'), html.indexOf('function parseHash'));
  assert.ok(renderSrc.includes("themeBox.innerHTML=''") || renderSrc.includes('themeBox.innerHTML=""'));
  assert.equal(renderSrc.includes('themeCard('), false);
  assert.ok(renderSrc.includes("setChrome('day'"));
  assert.ok(html.includes('id="themeTodayBtn"'));
  assert.ok(html.includes('오늘의 주제 ▶'));
  assert.ok(html.includes('function showThemeDay'));
  assert.ok(html.includes('#theme-day/'));
  const parseSrc = html.slice(html.indexOf('function parseView()'), html.indexOf('function render(ymd)'));
  assert.ok(parseSrc.includes('theme-day'));
  const applySrc = html.slice(html.indexOf('function applyView()'), html.indexOf("document.getElementById('prev')"));
  assert.ok(applySrc.includes("v.type==='theme-day'"));
  const chromeSrc = html.slice(html.indexOf('function setChrome'), html.indexOf('function showThemeDay'));
  assert.ok(chromeSrc.includes("mode==='index'||mode==='theme'"));
  assert.ok(chromeSrc.includes('dateNav.classList.add'));
});

test('theme files and the injected bundle stay in the basic multilingual plane', () => {
  const { THEMES } = loadThemesFromHtml();
  for (const n of themeFiles()) {
    const text = fs.readFileSync(path.join(dir, n), 'utf8');
    for (const ch of text) {
      assert.ok(ch.codePointAt(0) <= 0xFFFF, n + ' U+' + ch.codePointAt(0).toString(16).toUpperCase());
    }
  }
  const bundledText = fs.readFileSync(path.join(root, 'data', 'themes.json'), 'utf8');
  for (const ch of bundledText) {
    assert.ok(ch.codePointAt(0) <= 0xFFFF, 'themes.json U+' + ch.codePointAt(0).toString(16).toUpperCase());
  }
  const hansali = THEMES.find(t => t.id === 'hansali');
  const bo = hansali.items.find(it => (it.o || '').includes('保：'));
  assert.ok(bo, '保 item');
  assert.ok(bo.o.includes('从古文孚省'));
  assert.equal(bo.o.includes('\uD851\uDCFD') || [...bo.o].some(c => c.codePointAt(0) === 0x244FD), false);
});

test('theme items are separate colored cards with a kind label', () => {
  const { themeCard, themeKindInfo, THEMES } = loadThemeFns();
  const innae = THEMES.find(t => t.id === 'innae');
  const card = themeCard(innae, { caption: '그날의 주제' });
  assert.equal((card.match(/class="card theme"/g) || []).length, 1);
  assert.ok((card.match(/class="card theme-item /g) || []).length >= 5);
  assert.ok(card.includes('증광현문'));
  assert.ok(card.includes('채근담'));
  assert.ok(card.includes('한문 고전'));
  assert.ok(card.includes('우리 속담'));
  assert.ok(card.includes('영국 속담'));
  const zg = innae.items.find(it => /증광현문/.test(it.source));
  assert.deepEqual(themeKindInfo(zg), { cls: 'zg', label: '증광현문' });
  const saegil = THEMES.find(t => t.id === 'saegil');
  const job = saegil.items.find(it => /욥기/.test(it.source));
  assert.equal(themeKindInfo(job).cls, 'we');
  assert.equal(themeKindInfo(job).label, '성경');
  const yoji = THEMES.find(t => t.id === 'yojigyeong');
  assert.equal(themeKindInfo(yoji.items[0]).cls, 'tk-maxim');
  assert.equal(themeKindInfo(yoji.items[0]).label, '법칙');
  // day-page book colors stay in their original rules
  assert.ok(html.includes('.mx{background:#fff7ef;border-color:#e2c3a6;border-left-color:#a0522d}'));
  assert.ok(html.includes('.cg{background:#f3f8ef;border-color:#c6dbbb;border-left-color:#4f7d3a}'));
  assert.ok(html.includes('.zg{background:#f1f5fb;border-color:#c3d2e6;border-left-color:#3f5f8f}'));
  assert.ok(html.includes('.we{background:#f7f2fa;border-color:#d8c8e3;border-left-color:#7a4f96}'));
});
