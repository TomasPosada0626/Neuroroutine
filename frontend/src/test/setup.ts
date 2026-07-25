// Vitest setup file.
// Keep this minimal so tests run fast and stay deterministic.

// Some browser APIs may be missing in jsdom; add shims here when needed.

import '@testing-library/jest-dom/vitest';

Object.defineProperty(window.navigator, 'onLine', {
  configurable: true,
  writable: true,
  value: true,
});

// Node 22+ ships an experimental native `localStorage`/`sessionStorage` global that is
// inert unless the process is started with `--localstorage-file`. When present, it shadows
// jsdom's real Storage implementation on `globalThis` (vitest's jsdom env only copies window
// properties that aren't already defined on global), which breaks anything backed by
// localStorage (e.g. Zustand's `persist` middleware) with "Cannot read properties of
// undefined (reading 'setItem')". Force both globals back to jsdom's working implementation.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function ensureWorkingStorage(key: 'localStorage' | 'sessionStorage') {
  const current = typeof window !== 'undefined' ? window[key] : undefined;
  const isWorking = Boolean(
    current && typeof current.setItem === 'function' && typeof current.getItem === 'function',
  );
  if (isWorking) return;

  const storage = new MemoryStorage();
  for (const target of [globalThis, window] as const) {
    Object.defineProperty(target, key, {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

ensureWorkingStorage('localStorage');
ensureWorkingStorage('sessionStorage');
