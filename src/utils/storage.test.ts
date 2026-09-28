import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { safeLocalStorage, safeSessionStorage } from './storage';

describe('safeLocalStorage & safeSessionStorage', () => {
  let hasGlobalWindow: boolean;
  let originalWindow: typeof globalThis.window;
  let originalLocalStorage: Storage | undefined;
  let originalSessionStorage: Storage | undefined;

  beforeEach(() => {
    hasGlobalWindow = typeof globalThis.window !== 'undefined';
    if (!hasGlobalWindow) {
      // Create mock window object on globalThis for testing browser-like environments
      const mockStorage = () => {
        const store = new Map<string, string>();
        return {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => store.set(key, String(value)),
          removeItem: (key: string) => store.delete(key),
          clear: () => store.clear(),
          key: (i: number) => Array.from(store.keys())[i] ?? null,
          get length() {
            return store.size;
          },
        } as Storage;
      };

      (globalThis as unknown as { window: unknown }).window = {
        localStorage: mockStorage(),
        sessionStorage: mockStorage(),
      };
    }

    originalWindow = globalThis.window;
    originalLocalStorage = globalThis.window?.localStorage;
    originalSessionStorage = globalThis.window?.sessionStorage;
  });

  afterEach(() => {
    if (globalThis.window) {
      try {
        Object.defineProperty(globalThis.window, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
          writable: true,
        });
        Object.defineProperty(globalThis.window, 'sessionStorage', {
          value: originalSessionStorage,
          configurable: true,
          writable: true,
        });
      } catch {
        // ignore
      }
    }

    if (!hasGlobalWindow) {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });

  describe('Standard working environment', () => {
    test('safeLocalStorage sets, gets, and removes items', () => {
      safeLocalStorage.setItem('test_key', 'hello_local');
      expect(safeLocalStorage.getItem('test_key')).toBe('hello_local');

      safeLocalStorage.removeItem('test_key');
      expect(safeLocalStorage.getItem('test_key')).toBeNull();
    });

    test('safeSessionStorage sets, gets, and removes items', () => {
      safeSessionStorage.setItem('test_key_session', 'hello_session');
      expect(safeSessionStorage.getItem('test_key_session')).toBe('hello_session');

      safeSessionStorage.removeItem('test_key_session');
      expect(safeSessionStorage.getItem('test_key_session')).toBeNull();
    });

    test('returns null for non-existent keys', () => {
      expect(safeLocalStorage.getItem('non_existent_key_123')).toBeNull();
      expect(safeSessionStorage.getItem('non_existent_key_456')).toBeNull();
    });
  });

  describe('Restricted environment (getItem/setItem/removeItem throwing DOMException/SecurityError)', () => {
    test('safeLocalStorage.getItem falls back to memory store when window.localStorage.getItem throws', () => {
      const mockLocalStorage = {
        getItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
        setItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
        removeItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
        clear: () => {},
        key: () => null,
        length: 0,
      };

      Object.defineProperty(globalThis.window, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
        writable: true,
      });

      // Should fall back gracefully to memory store without throwing
      expect(safeLocalStorage.getItem('restricted_key')).toBeNull();

      safeLocalStorage.setItem('restricted_key', 'fallback_value');
      expect(safeLocalStorage.getItem('restricted_key')).toBe('fallback_value');

      safeLocalStorage.removeItem('restricted_key');
      expect(safeLocalStorage.getItem('restricted_key')).toBeNull();
    });

    test('safeSessionStorage.getItem falls back to memory store when window.sessionStorage.getItem throws', () => {
      const mockSessionStorage = {
        getItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
        setItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
        removeItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
        clear: () => {},
        key: () => null,
        length: 0,
      };

      Object.defineProperty(globalThis.window, 'sessionStorage', {
        value: mockSessionStorage,
        configurable: true,
        writable: true,
      });

      // Should fall back gracefully to memory store without throwing
      expect(safeSessionStorage.getItem('restricted_session_key')).toBeNull();

      safeSessionStorage.setItem('restricted_session_key', 'fallback_session_value');
      expect(safeSessionStorage.getItem('restricted_session_key')).toBe('fallback_session_value');

      safeSessionStorage.removeItem('restricted_session_key');
      expect(safeSessionStorage.getItem('restricted_session_key')).toBeNull();
    });

    test('safeLocalStorage handles error when property access to window.localStorage throws', () => {
      Object.defineProperty(globalThis.window, 'localStorage', {
        get() {
          throw new DOMException('The document is sandboxed and lacks the "allow-same-origin" flag.', 'SecurityError');
        },
        configurable: true,
      });

      expect(() => safeLocalStorage.getItem('sandboxed_key')).not.toThrow();
      expect(safeLocalStorage.getItem('sandboxed_key')).toBeNull();

      safeLocalStorage.setItem('sandboxed_key', 'sandboxed_val');
      expect(safeLocalStorage.getItem('sandboxed_key')).toBe('sandboxed_val');

      safeLocalStorage.removeItem('sandboxed_key');
      expect(safeLocalStorage.getItem('sandboxed_key')).toBeNull();
    });

    test('safeSessionStorage handles error when property access to window.sessionStorage throws', () => {
      Object.defineProperty(globalThis.window, 'sessionStorage', {
        get() {
          throw new DOMException('The document is sandboxed and lacks the "allow-same-origin" flag.', 'SecurityError');
        },
        configurable: true,
      });

      expect(() => safeSessionStorage.getItem('sandboxed_session_key')).not.toThrow();
      expect(safeSessionStorage.getItem('sandboxed_session_key')).toBeNull();

      safeSessionStorage.setItem('sandboxed_session_key', 'sandboxed_val');
      expect(safeSessionStorage.getItem('sandboxed_session_key')).toBe('sandboxed_val');

      safeSessionStorage.removeItem('sandboxed_session_key');
      expect(safeSessionStorage.getItem('sandboxed_session_key')).toBeNull();
    });
  });

  describe('Non-browser / SSR environment (null/undefined window or storage)', () => {
    test('safeLocalStorage works when localStorage is null', () => {
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: null,
        configurable: true,
        writable: true,
      });

      safeLocalStorage.setItem('ssr_key', 'ssr_value');
      expect(safeLocalStorage.getItem('ssr_key')).toBe('ssr_value');
      safeLocalStorage.removeItem('ssr_key');
      expect(safeLocalStorage.getItem('ssr_key')).toBeNull();
    });

    test('safeSessionStorage works when sessionStorage is null', () => {
      Object.defineProperty(globalThis.window, 'sessionStorage', {
        value: null,
        configurable: true,
        writable: true,
      });

      safeSessionStorage.setItem('ssr_session_key', 'ssr_session_value');
      expect(safeSessionStorage.getItem('ssr_session_key')).toBe('ssr_session_value');
      safeSessionStorage.removeItem('ssr_session_key');
      expect(safeSessionStorage.getItem('ssr_session_key')).toBeNull();
    });

    test('safeLocalStorage and safeSessionStorage work when window is undefined', () => {
      delete (globalThis as unknown as { window?: unknown }).window;

      expect(typeof window).toBe('undefined');

      safeLocalStorage.setItem('no_window_local', 'local_val');
      expect(safeLocalStorage.getItem('no_window_local')).toBe('local_val');

      safeSessionStorage.setItem('no_window_session', 'session_val');
      expect(safeSessionStorage.getItem('no_window_session')).toBe('session_val');
    });
  });
});
