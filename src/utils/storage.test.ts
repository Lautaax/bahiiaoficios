// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { safeLocalStorage, safeSessionStorage } from './storage';

describe('safeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('safeLocalStorage', () => {
    it('should set, get, and remove items normally when localStorage is available', () => {
      safeLocalStorage.setItem('testKey', 'testValue');
      expect(localStorage.getItem('testKey')).toBe('testValue');
      expect(safeLocalStorage.getItem('testKey')).toBe('testValue');

      safeLocalStorage.removeItem('testKey');
      expect(localStorage.getItem('testKey')).toBeNull();
      expect(safeLocalStorage.getItem('testKey')).toBeNull();
    });

    it('should fall back to in-memory store when localStorage.setItem throws DOMException', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError: The quota has been exceeded.', 'QuotaExceededError');
      });

      expect(() => safeLocalStorage.setItem('quotaKey', 'someValue')).not.toThrow();

      // getItem should fetch from memory storage as fallback
      expect(safeLocalStorage.getItem('quotaKey')).toBe('someValue');
    });

    it('should fall back to in-memory store when localStorage.setItem throws SecurityError', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });

      expect(() => safeLocalStorage.setItem('secKey', 'secValue')).not.toThrow();
      expect(safeLocalStorage.getItem('secKey')).toBe('secValue');
    });

    it('should fall back to in-memory store when localStorage.getItem throws an exception', () => {
      // First put an item in memory storage via setItem throwing an exception
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      safeLocalStorage.setItem('fallbackGet', 'fallbackVal');

      // Now mock getItem on localStorage to throw as well
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => safeLocalStorage.getItem('fallbackGet')).not.toThrow();
      expect(safeLocalStorage.getItem('fallbackGet')).toBe('fallbackVal');
    });

    it('should fall back to in-memory store when localStorage.removeItem throws an exception', () => {
      safeLocalStorage.setItem('fallbackRemove', 'val');

      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => safeLocalStorage.removeItem('fallbackRemove')).not.toThrow();
    });

    it('should handle property getter throwing when accessing window.localStorage', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Security error accessing localStorage', 'SecurityError');
        },
        configurable: true
      });

      expect(() => safeLocalStorage.setItem('propErr', 'val')).not.toThrow();
      expect(safeLocalStorage.getItem('propErr')).toBe('val');

      expect(() => safeLocalStorage.removeItem('propErr')).not.toThrow();

      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true
      });
    });

    it('should fall back to memory store when window.localStorage is undefined', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get() {
          return undefined;
        },
        configurable: true
      });

      safeLocalStorage.setItem('noStorageKey', 'noStorageValue');
      expect(safeLocalStorage.getItem('noStorageKey')).toBe('noStorageValue');
      safeLocalStorage.removeItem('noStorageKey');

      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true
      });
    });
  });

  describe('safeSessionStorage', () => {
    it('should set, get, and remove items normally when sessionStorage is available', () => {
      safeSessionStorage.setItem('sessionKey', 'sessionVal');
      expect(sessionStorage.getItem('sessionKey')).toBe('sessionVal');
      expect(safeSessionStorage.getItem('sessionKey')).toBe('sessionVal');

      safeSessionStorage.removeItem('sessionKey');
      expect(sessionStorage.getItem('sessionKey')).toBeNull();
      expect(safeSessionStorage.getItem('sessionKey')).toBeNull();
    });

    it('should fall back to in-memory store when sessionStorage.setItem throws DOMException', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      expect(() => safeSessionStorage.setItem('sessQuota', 'val')).not.toThrow();
      expect(safeSessionStorage.getItem('sessQuota')).toBe('val');
    });

    it('should fall back to in-memory store when sessionStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Blocked');
      });
      safeSessionStorage.setItem('sessErr', 'val');

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Blocked');
      });

      expect(() => safeSessionStorage.getItem('sessErr')).not.toThrow();
      expect(safeSessionStorage.getItem('sessErr')).toBe('val');
    });

    it('should fall back to in-memory store when sessionStorage.removeItem throws', () => {
      safeSessionStorage.setItem('sessRemErr', 'val');

      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Blocked');
      });

      expect(() => safeSessionStorage.removeItem('sessRemErr')).not.toThrow();
    });

    it('should fall back to memory store when window.sessionStorage is undefined', () => {
      const originalSessionStorage = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          return undefined;
        },
        configurable: true
      });

      safeSessionStorage.setItem('noSessStorageKey', 'noSessStorageVal');
      expect(safeSessionStorage.getItem('noSessStorageKey')).toBe('noSessStorageVal');
      safeSessionStorage.removeItem('noSessStorageKey');

      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
        writable: true
      });
    });
  });
});
