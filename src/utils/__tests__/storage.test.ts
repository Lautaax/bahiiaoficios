import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { safeLocalStorage, safeSessionStorage } from '../storage';

describe('safeLocalStorage & safeSessionStorage', () => {
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  beforeEach(() => {
    // Clear localStorage & sessionStorage mock states before each test
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('safeLocalStorage', () => {
    describe('normal window.localStorage operations', () => {
      it('should set and get items correctly', () => {
        safeLocalStorage.setItem('testKey', 'testValue');
        expect(safeLocalStorage.getItem('testKey')).toBe('testValue');
        expect(window.localStorage.getItem('testKey')).toBe('testValue');
      });

      it('should remove items correctly', () => {
        safeLocalStorage.setItem('testKey', 'testValue');
        expect(safeLocalStorage.getItem('testKey')).toBe('testValue');
        safeLocalStorage.removeItem('testKey');
        expect(safeLocalStorage.getItem('testKey')).toBeNull();
        expect(window.localStorage.getItem('testKey')).toBeNull();
      });

      it('should return null for non-existent items', () => {
        expect(safeLocalStorage.getItem('nonExistentKey')).toBeNull();
      });
    });

    describe('fallback when window.localStorage throws error (e.g. restricted iframe/SecurityError)', () => {
      it('should fallback to MemoryStorage on setItem error', () => {
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        // Set item should catch error and write to memory store
        safeLocalStorage.setItem('fallbackKey', 'fallbackValue');

        // Verify window.localStorage.getItem also throws or we test getItem fallback separately
        vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        expect(safeLocalStorage.getItem('fallbackKey')).toBe('fallbackValue');
      });

      it('should fallback to MemoryStorage on getItem error', () => {
        vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        // Should return from MemoryStorage (which currently hasn't set 'key', so null)
        expect(safeLocalStorage.getItem('testKey')).toBeNull();
      });

      it('should fallback to MemoryStorage on removeItem error', () => {
        // First set item in memory fallback by throwing on setItem
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });
        vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        safeLocalStorage.setItem('removeKey', 'removeVal');
        expect(safeLocalStorage.getItem('removeKey')).toBe('removeVal');

        // Now throw on removeItem
        vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        safeLocalStorage.removeItem('removeKey');
        expect(safeLocalStorage.getItem('removeKey')).toBeNull();
      });
    });
  });

  describe('safeSessionStorage', () => {
    describe('normal window.sessionStorage operations', () => {
      it('should set and get items correctly', () => {
        safeSessionStorage.setItem('sessionKey', 'sessionValue');
        expect(safeSessionStorage.getItem('sessionKey')).toBe('sessionValue');
        expect(window.sessionStorage.getItem('sessionKey')).toBe('sessionValue');
      });

      it('should remove items correctly', () => {
        safeSessionStorage.setItem('sessionKey', 'sessionValue');
        expect(safeSessionStorage.getItem('sessionKey')).toBe('sessionValue');
        safeSessionStorage.removeItem('sessionKey');
        expect(safeSessionStorage.getItem('sessionKey')).toBeNull();
        expect(window.sessionStorage.getItem('sessionKey')).toBeNull();
      });

      it('should return null for non-existent items', () => {
        expect(safeSessionStorage.getItem('nonExistentKey')).toBeNull();
      });
    });

    describe('fallback when window.sessionStorage throws error', () => {
      it('should fallback to MemoryStorage on setItem error', () => {
        vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        safeSessionStorage.setItem('sessionFallbackKey', 'sessionFallbackValue');

        vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        expect(safeSessionStorage.getItem('sessionFallbackKey')).toBe('sessionFallbackValue');
      });

      it('should fallback to MemoryStorage on getItem error', () => {
        vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        expect(safeSessionStorage.getItem('sessionKey')).toBeNull();
      });

      it('should fallback to MemoryStorage on removeItem error', () => {
        vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });
        vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        safeSessionStorage.setItem('sessionRemoveKey', 'sessionRemoveVal');
        expect(safeSessionStorage.getItem('sessionRemoveKey')).toBe('sessionRemoveVal');

        vi.spyOn(window.sessionStorage, 'removeItem').mockImplementation(() => {
          throw new Error('SecurityError: Access is denied');
        });

        safeSessionStorage.removeItem('sessionRemoveKey');
        expect(safeSessionStorage.getItem('sessionRemoveKey')).toBeNull();
      });
    });
  });
});
