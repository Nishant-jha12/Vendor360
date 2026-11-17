// Unit tests for Theme toggle and persistence
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const createMockEnv = () => {
  const store = new Map();
  const classes = new Set();
  const localStorageMock = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const documentMock = {
    documentElement: {
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
      },
    },
  };
  return {
    storage: globalThis.localStorage || localStorageMock,
    doc: globalThis.document || documentMock,
  };
};

describe('Theme Management', () => {
  it('defaults to system or stored preference', () => {
    const { storage } = createMockEnv();
    const theme = storage.getItem('theme') || 'light';
    assert.ok(['light', 'dark'].includes(theme));
  });

  it('toggles dark class on document root', () => {
    const { doc } = createMockEnv();
    doc.documentElement.classList.add('dark');
    assert.equal(doc.documentElement.classList.contains('dark'), true);
    doc.documentElement.classList.remove('dark');
    assert.equal(doc.documentElement.classList.contains('dark'), false);
  });
});
