// Unit tests for vernacular dictionaries
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const loadLocale = (code) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'locales', `${code}.json`), 'utf8'));

const en = loadLocale('en');
const hi = loadLocale('hi');
const mr = loadLocale('mr');
const bn = loadLocale('bn');

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe('Vernacular Localization', () => {
  it('guarantees top-level and leaf key equality across all 4 locales', () => {
    const enTopKeys = Object.keys(en);
    assert.deepEqual(Object.keys(hi), enTopKeys);
    assert.deepEqual(Object.keys(mr), enTopKeys);
    assert.deepEqual(Object.keys(bn), enTopKeys);

    const enLeafKeys = flatten(en).sort();
    assert.deepEqual(flatten(hi).sort(), enLeafKeys);
    assert.deepEqual(flatten(mr).sort(), enLeafKeys);
    assert.deepEqual(flatten(bn).sort(), enLeafKeys);
  });

  it('contains theme translations in all languages', () => {
    assert.ok(en.theme?.light);
    assert.ok(hi.theme?.light);
    assert.ok(mr.theme?.light);
    assert.ok(bn.theme?.light);
  });
});
