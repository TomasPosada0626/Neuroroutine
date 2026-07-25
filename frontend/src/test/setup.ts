// Vitest setup file.
// Keep this minimal so tests run fast and stay deterministic.

// Some browser APIs may be missing in jsdom; add shims here when needed.

import '@testing-library/jest-dom/vitest';

Object.defineProperty(window.navigator, 'onLine', {
  configurable: true,
  writable: true,
  value: true,
});

// Newer Node versions ship an experimental native `localStorage`/`sessionStorage` global
// that can shadow jsdom's own Storage on `globalThis`, breaking anything backed by
// localStorage (e.g. Zustand's `persist` middleware) with "Cannot read properties of
// undefined (reading 'setItem')". jsdom's own implementation isn't reliable to detect either:
// on some Node/jsdom combinations the `window.localStorage` getter returns a fresh instance
// per access instead of a memoized singleton, which silently breaks anything that grabs a
// reference once and reuses it (again, exactly what Zustand's `persist` does). Rather than
// try to detect which behavior the current Node/jsdom pairing has, always install one fixed,
// known-good instance so tests behave identically across Node versions.
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

function installFixedStorage(key: 'localStorage' | 'sessionStorage') {
  const storage = new MemoryStorage();
  for (const target of [globalThis, window] as const) {
    Object.defineProperty(target, key, {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

installFixedStorage('localStorage');
installFixedStorage('sessionStorage');
