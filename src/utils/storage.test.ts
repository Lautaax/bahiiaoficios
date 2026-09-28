import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeLocalStorage, safeSessionStorage } from './storage';

describe('safeLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getItem', () => {
    it('retrieves item from localStorage when available', () => {
      window.localStorage.setItem('test-key', 'test-value');
      expect(safeLocalStorage.getItem('test-key')).toBe('test-value');
    });

    it('returns null if item does not exist in localStorage', () => {
      expect(safeLocalStorage.getItem('non-existent')).toBeNull();
    });

    it('falls back to memory store when window.localStorage.getItem throws an error', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('SecurityError: Access is denied');
      });
      const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: Access is denied');
      });

      safeLocalStorage.setItem('fallback-key', 'fallback-value');
      const value = safeLocalStorage.getItem('fallback-key');

      expect(value).toBe('fallback-value');
      expect(getItemSpy).toHaveBeenCalledWith('fallback-key');
      expect(setItemSpy).toHaveBeenCalledWith('fallback-key', 'fallback-value');

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });

    it('falls back to memory store when accessing window.localStorage property throws an error', () => {
      const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
      try {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('Denied access to localStorage property');
          },
          configurable: true,
        });

        safeLocalStorage.setItem('prop-key', 'prop-val');
        expect(safeLocalStorage.getItem('prop-key')).toBe('prop-val');
      } finally {
        if (originalLocalStorage) {
          Object.defineProperty(window, 'localStorage', originalLocalStorage);
        }
      }
    });
  });

  describe('setItem', () => {
    it('sets item in localStorage when available', () => {
      safeLocalStorage.setItem('key1', 'val1');
      expect(window.localStorage.getItem('key1')).toBe('val1');
    });

    it('handles storing empty string values', () => {
      safeLocalStorage.setItem('empty-key', '');
      expect(safeLocalStorage.getItem('empty-key')).toBe('');
    });

    it('falls back to memory store when window.localStorage.setItem throws an error', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      safeLocalStorage.setItem('quota-key', 'quota-value');

      const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(safeLocalStorage.getItem('quota-key')).toBe('quota-value');

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });
  });

  describe('removeItem', () => {
    it('removes item from localStorage when available', () => {
      window.localStorage.setItem('remove-key', 'remove-val');
      safeLocalStorage.removeItem('remove-key');
      expect(window.localStorage.getItem('remove-key')).toBeNull();
    });

    it('falls back to memory store when window.localStorage.removeItem throws an error', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      safeLocalStorage.setItem('mem-key', 'mem-val');

      const removeItemSpy = vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      safeLocalStorage.removeItem('mem-key');

      const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(safeLocalStorage.getItem('mem-key')).toBeNull();

      setItemSpy.mockRestore();
      removeItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });
  });
});

describe('safeSessionStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getItem', () => {
    it('retrieves item from sessionStorage when available', () => {
      window.sessionStorage.setItem('session-key', 'session-value');
      expect(safeSessionStorage.getItem('session-key')).toBe('session-value');
    });

    it('returns null if item does not exist in sessionStorage', () => {
      expect(safeSessionStorage.getItem('non-existent-session')).toBeNull();
    });

    it('falls back to memory store when window.sessionStorage.getItem throws an error', () => {
      const setItemSpy = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('Restricted iframe');
      });
      safeSessionStorage.setItem('s-fallback', 's-value');

      const getItemSpy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('Restricted iframe');
      });
      expect(safeSessionStorage.getItem('s-fallback')).toBe('s-value');

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });

    it('falls back to memory store when accessing window.sessionStorage property throws an error', () => {
      const originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
      try {
        Object.defineProperty(window, 'sessionStorage', {
          get() {
            throw new Error('Denied access to sessionStorage property');
          },
          configurable: true,
        });

        safeSessionStorage.setItem('s-prop-key', 's-prop-val');
        expect(safeSessionStorage.getItem('s-prop-key')).toBe('s-prop-val');
      } finally {
        if (originalSessionStorage) {
          Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
        }
      }
    });
  });

  describe('setItem', () => {
    it('sets item in sessionStorage when available', () => {
      safeSessionStorage.setItem('skey', 'sval');
      expect(window.sessionStorage.getItem('skey')).toBe('sval');
    });

    it('falls back to memory store when window.sessionStorage.setItem throws an error', () => {
      const setItemSpy = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('DOMException');
      });

      safeSessionStorage.setItem('skey2', 'sval2');

      const getItemSpy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('DOMException');
      });

      expect(safeSessionStorage.getItem('skey2')).toBe('sval2');

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });
  });

  describe('removeItem', () => {
    it('removes item from sessionStorage when available', () => {
      window.sessionStorage.setItem('s-remove', 'val');
      safeSessionStorage.removeItem('s-remove');
      expect(window.sessionStorage.getItem('s-remove')).toBeNull();
    });

    it('falls back to memory store when window.sessionStorage.removeItem throws an error', () => {
      const setItemSpy = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('DOMException');
      });
      safeSessionStorage.setItem('s-remove-mem', 'val');

      const removeItemSpy = vi.spyOn(window.sessionStorage, 'removeItem').mockImplementation(() => {
        throw new Error('DOMException');
      });
      safeSessionStorage.removeItem('s-remove-mem');

      const getItemSpy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('DOMException');
      });
      expect(safeSessionStorage.getItem('s-remove-mem')).toBeNull();

      setItemSpy.mockRestore();
      removeItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });
  });
});
