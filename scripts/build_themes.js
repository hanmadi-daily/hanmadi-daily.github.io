#!/usr/bin/env node
/**
 * data/themes/*.json 을 읽어 index.html 과 data/themes.json 에 넣습니다.
 * 주제 파일을 추가한 뒤 이 스크립트만 다시 실행하면 됩니다. 코드 목록은 고치지 않습니다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'data', 'themes');
const htmlPath = path.join(root, 'index.html');
const outJson = path.join(root, 'data', 'themes.json');
const BEGIN = '/* THEMES-BEGIN */';
const END = '/* THEMES-END */';

function isThemeFile(name) {
  return name.endsWith('.json') && !name.startsWith('_');
}

function loadConfig() {
  const p = path.join(dir, '_config.json');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.start || '')) {
    throw new Error('data/themes/_config.json 의 start 가 YYYY-MM-DD 가 아닙니다.');
  }
  return cfg;
}

function validate(theme, file) {
  if (!theme.id || !/^[a-z0-9-]+$/.test(theme.id)) {
    throw new Error(file + ': id 는 영문 소문자·숫자·하이픈만');
  }
  if (!theme.title) throw new Error(file + ': title 이 없습니다');
  if (typeof theme.order !== 'number') throw new Error(file + ': order 숫자');
  if (!Array.isArray(theme.items) || theme.items.length < 1) {
    throw new Error(file + ': items 가 비었습니다');
  }
  for (const [i, it] of theme.items.entries()) {
    if (!it.o || !it.p || !it.source) {
      throw new Error(file + ' 항목 ' + (i + 1) + ': o, p, source 가 필요합니다');
    }
  }
  if (theme.since && !/^\d{4}-\d{2}-\d{2}$/.test(theme.since)) {
    throw new Error(file + ': since 는 YYYY-MM-DD');
  }
}

function loadThemes() {
  const names = fs.readdirSync(dir).filter(isThemeFile);
  const themes = names.map(name => {
    const theme = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    validate(theme, name);
    return theme;
  });
  const ids = new Set();
  for (const t of themes) {
    if (ids.has(t.id)) throw new Error('id 중복: ' + t.id);
    ids.add(t.id);
  }
  themes.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return themes;
}

function bundle(cfg, themes) {
  return { start: cfg.start, themes };
}

function inject(html, cfg, themes) {
  const payload = BEGIN + '\n' +
    'const THEME_START=' + JSON.stringify(cfg.start) + ';\n' +
    'const THEMES=' + JSON.stringify(themes) + ';\n' +
    END;
  if (html.includes(BEGIN) && html.includes(END)) {
    return html.replace(new RegExp(BEGIN.replace(/[/*]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[/*]/g, '\\$&')), payload);
  }
  // first time: insert after const START=...;
  const re = /const START=\[[^\]]+\];\n/;
  if (!re.test(html)) throw new Error('index.html 에서 const START 를 찾지 못했습니다.');
  return html.replace(re, (m) => m + payload + '\n');
}

const cfg = loadConfig();
const themes = loadThemes();
const data = bundle(cfg, themes);
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(data, null, 2) + '\n', 'utf8');

let html = fs.readFileSync(htmlPath, 'utf8');
html = inject(html, cfg, themes);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('themes', themes.length, 'start', cfg.start);
console.log('wrote', path.relative(root, outJson), 'and updated index.html');
