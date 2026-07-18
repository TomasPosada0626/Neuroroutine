// Vitest setup file.
// Keep this minimal so tests run fast and stay deterministic.

// Some browser APIs may be missing in jsdom; add shims here when needed.

import '@testing-library/jest-dom/vitest'

Object.defineProperty(window.navigator, 'onLine', {
	configurable: true,
	writable: true,
	value: true,
})
