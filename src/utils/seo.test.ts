// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  updateMetaTag,
  updateCanonicalLink,
  injectJsonLd,
  removeJsonLd,
  getLocalBusinessSchemaType,
  generateLocalBusinessSchema,
  generateProfessionLandingSchema,
} from './seo';
import { User, Review } from '../types';

describe('SEO Utilities', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('updateMetaTag', () => {
    it('creates a new meta tag in document.head when none exists', () => {
      updateMetaTag('name', 'description', 'Test Description');

      const meta = document.querySelector('meta[name="description"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute('content')).toBe('Test Description');
    });

    it('updates existing meta tag content when it already exists', () => {
      // First call creates element
      updateMetaTag('name', 'description', 'Initial Description');
      // Second call updates element
      updateMetaTag('name', 'description', 'Updated Description');

      const metas = document.querySelectorAll('meta[name="description"]');
      expect(metas.length).toBe(1);
      expect(metas[0].getAttribute('content')).toBe('Updated Description');
    });

    it('works with property attribute (OpenGraph)', () => {
      updateMetaTag('property', 'og:title', 'My Page Title');

      const meta = document.querySelector('meta[property="og:title"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute('content')).toBe('My Page Title');
    });

    it('handles attribute values with quotes and special characters without throwing', () => {
      expect(() => {
        updateMetaTag('name', 'special"quote]val', 'Special Content');
      }).not.toThrow();

      const meta = Array.from(document.getElementsByTagName('meta')).find(
        (m) => m.getAttribute('name') === 'special"quote]val'
      );
      expect(meta).not.toBeUndefined();
      expect(meta?.getAttribute('content')).toBe('Special Content');
    });

    it('handles empty attributeName or attributeValue gracefully', () => {
      const initialHeadCount = document.head.children.length;
      updateMetaTag('', 'value', 'content');
      updateMetaTag('name', '', 'content');
      expect(document.head.children.length).toBe(initialHeadCount);
    });

    it('handles SSR / missing document safely', () => {
      const originalDocument = globalThis.document;
      // @ts-ignore
      delete globalThis.document;

      expect(() => {
        updateMetaTag('name', 'description', 'SSR Test');
      }).not.toThrow();

      globalThis.document = originalDocument;
    });
  });

  describe('updateCanonicalLink', () => {
    it('creates a canonical link element when none exists', () => {
      updateCanonicalLink('https://example.com/page');

      const link = document.querySelector('link[rel="canonical"]');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://example.com/page');
    });

    it('updates an existing canonical link href', () => {
      updateCanonicalLink('https://example.com/v1');
      updateCanonicalLink('https://example.com/v2');

      const links = document.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe('https://example.com/v2');
    });

    it('handles empty url gracefully', () => {
      updateCanonicalLink('');
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    });

    it('handles SSR / missing document safely', () => {
      const originalDocument = globalThis.document;
      // @ts-ignore
      delete globalThis.document;

      expect(() => {
        updateCanonicalLink('https://example.com');
      }).not.toThrow();

      globalThis.document = originalDocument;
    });
  });

  describe('injectJsonLd & removeJsonLd', () => {
    it('injects JSON-LD script into head', () => {
      const data = { '@context': 'https://schema.org', '@type': 'Thing', name: 'Test' };
      injectJsonLd('test-id', data);

      const script = document.getElementById('json-ld-test-id');
      expect(script).not.toBeNull();
      expect(script?.getAttribute('type')).toBe('application/ld+json');
      expect(JSON.parse(script?.textContent || '{}')).toEqual(data);
    });

    it('updates existing JSON-LD script content', () => {
      injectJsonLd('test-id', { value: 1 });
      injectJsonLd('test-id', { value: 2 });

      const scripts = document.querySelectorAll('#json-ld-test-id');
      expect(scripts.length).toBe(1);
      expect(JSON.parse(scripts[0].textContent || '{}')).toEqual({ value: 2 });
    });

    it('removes injected JSON-LD script', () => {
      injectJsonLd('test-id', { value: 1 });
      expect(document.getElementById('json-ld-test-id')).not.toBeNull();

      removeJsonLd('test-id');
      expect(document.getElementById('json-ld-test-id')).toBeNull();
    });

    it('removeJsonLd does not fail when element does not exist', () => {
      expect(() => {
        removeJsonLd('non-existent-id');
      }).not.toThrow();
    });

    it('handles SSR / missing document safely', () => {
      const originalDocument = globalThis.document;
      // @ts-ignore
      delete globalThis.document;

      expect(() => {
        injectJsonLd('test', { a: 1 });
        removeJsonLd('test');
      }).not.toThrow();

      globalThis.document = originalDocument;
    });
  });

  describe('getLocalBusinessSchemaType', () => {
    it('returns default schema types when no rubro is provided', () => {
      expect(getLocalBusinessSchemaType()).toEqual(['LocalBusiness', 'ProfessionalService']);
      expect(getLocalBusinessSchemaType('')).toEqual(['LocalBusiness', 'ProfessionalService']);
    });

    it('maps known rubros to Schema.org types', () => {
      expect(getLocalBusinessSchemaType('Electricista')).toContain('Electrician');
      expect(getLocalBusinessSchemaType('Plomero')).toContain('Plumber');
      expect(getLocalBusinessSchemaType('Gasista')).toContain('Plumber');
      expect(getLocalBusinessSchemaType('Techista')).toContain('RoofingContractor');
      expect(getLocalBusinessSchemaType('Cerrajero')).toContain('Locksmith');
      expect(getLocalBusinessSchemaType('Pintor')).toContain('GeneralContractor');
      expect(getLocalBusinessSchemaType('Albañil')).toContain('GeneralContractor');
      expect(getLocalBusinessSchemaType('Mecánico')).toContain('AutoRepair');
      expect(getLocalBusinessSchemaType('Limpieza')).toContain('ProfessionalService');
      expect(getLocalBusinessSchemaType('Abogado')).toContain('LegalService');
      expect(getLocalBusinessSchemaType('Contador')).toContain('AccountingService');
    });

    it('returns fallback ProfessionalService for unknown rubro', () => {
      expect(getLocalBusinessSchemaType('Jardinería')).toEqual(['ProfessionalService', 'LocalBusiness']);
    });
  });

  describe('generateLocalBusinessSchema', () => {
    const mockUser: User = {
      uid: 'pro-123',
      email: 'juan@example.com',
      nombre: 'Juan Pérez',
      rol: 'profesional',
      fotoUrl: 'https://example.com/avatar.jpg',
      ciudad: 'Bahía Blanca',
      zona: 'Palihue',
      profesionalInfo: {
        rubro: 'Electricista',
        descripcion: 'Servicios de electricidad general y obras.',
        isVip: false,
        telefono: '2911234567',
        precioMinimo: 15000,
        fotoPortada: 'https://example.com/portada.jpg',
        fotosTrabajos: [],
        reviewCount: 2,
        ratingAvg: 4.5,
      },
    };

    it('generates structured schema for a professional', () => {
      const schema = generateLocalBusinessSchema(mockUser);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toContain('Electrician');
      expect(schema.name).toBe('Juan Pérez');
      expect(schema.telephone).toBe('2911234567');
      expect(schema.priceRange).toBe('$15.000+');
      expect(schema.address.streetAddress).toBe('Palihue, Bahía Blanca');
      expect(schema.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 2,
        bestRating: '5',
        worstRating: '1',
      });
    });

    it('includes reviews in schema when provided', () => {
      const mockReviews: Review[] = [
        {
          id: 'r1',
          profesionalId: 'pro-123',
          clienteId: 'c1',
          clienteNombre: 'Carlos',
          rating: 5,
          comentario: 'Excelente trabajo.',
          fecha: new Date('2025-01-15'),
        },
      ];

      const schema = generateLocalBusinessSchema(mockUser, mockReviews);
      expect(schema.review).toBeDefined();
      expect(schema.review.length).toBe(1);
      expect(schema.review[0].author.name).toBe('Carlos');
      expect(schema.review[0].reviewRating.ratingValue).toBe(5);
    });

    it('uses fallback image when no images are present', () => {
      const userWithoutImages: User = {
        ...mockUser,
        fotoUrl: undefined,
        profesionalInfo: {
          ...mockUser.profesionalInfo,
          fotoPortada: undefined,
        },
      };

      const schema = generateLocalBusinessSchema(userWithoutImages);
      expect(schema.image).toBeDefined();
      expect(schema.image[0]).toContain('unsplash');
    });
  });

  describe('generateProfessionLandingSchema', () => {
    it('generates ItemList schema for a profession page', () => {
      const mockProfessionals: User[] = [
        {
          uid: 'p1',
          email: 'pro1@example.com',
          nombre: 'Ana Gómez',
          fotoUrl: 'https://example.com/ana.jpg',
          rol: 'profesional',
          ciudad: 'Bahía Blanca',
          zona: 'Centro',
          profesionalInfo: {
            rubro: 'Plomero',
            descripcion: 'Plomero matriculado.',
            isVip: false,
            ratingAvg: 5.0,
            reviewCount: 1,
            fotosTrabajos: [],
          },
        },
      ];

      const schema = generateProfessionLandingSchema('Plomero', mockProfessionals);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.name).toBe('Plomeros en Bahía Blanca');
      expect(schema.numberOfItems).toBe(1);
      expect(schema.itemListElement.length).toBe(1);
      expect(schema.itemListElement[0].item.name).toBe('Ana Gómez');
    });
  });
});
