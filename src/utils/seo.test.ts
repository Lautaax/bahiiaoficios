import { describe, test, expect, beforeEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import { injectJsonLd, removeJsonLd } from './seo';

describe('removeJsonLd', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
  });

  test('injects and then removes JSON-LD script node from document head', () => {
    const id = 'test-schema';
    const data = { '@context': 'https://schema.org', '@type': 'Thing', name: 'Test' };

    injectJsonLd(id, data);
    const scriptId = `json-ld-${id}`;
    expect(document.getElementById(scriptId)).not.toBeNull();

    removeJsonLd(id);
    expect(document.getElementById(scriptId)).toBeNull();
  });

  test('does not throw when removing non-existent JSON-LD script', () => {
    expect(() => removeJsonLd('non-existent-id')).not.toThrow();
  });

  test('does not throw or fail when script node exists but has no parentNode', () => {
    const scriptId = 'json-ld-orphan';
    const orphanScript = document.createElement('script');
    orphanScript.id = scriptId;

    // Spy on getElementById to return an orphan script element without parentNode
    const originalGetElementById = document.getElementById.bind(document);
    document.getElementById = (id: string) => {
      if (id === scriptId) {
        return orphanScript;
      }
      return originalGetElementById(id);
    };

    expect(() => removeJsonLd('orphan')).not.toThrow();
    expect(orphanScript.parentNode).toBeNull();
  });
});
