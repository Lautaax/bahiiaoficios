// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  injectJsonLd,
  removeJsonLd,
  updateMetaTag,
  updateCanonicalLink,
  getLocalBusinessSchemaType,
  generateLocalBusinessSchema,
  generateProfessionLandingSchema,
} from './seo';
import { User, Review } from '../types';

describe('SEO Utilities & JSON-LD Injection', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('injectJsonLd', () => {
    it('creates and inserts a script tag with application/ld+json in head', () => {
      const data = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Test Org' };
      injectJsonLd('test-org', data);

      const script = document.getElementById('json-ld-test-org') as HTMLScriptElement | null;
      expect(script).not.toBeNull();
      expect(script?.type).toBe('application/ld+json');
      expect(script?.parentNode).toBe(document.head);
      expect(JSON.parse(script?.textContent || '')).toEqual(data);
    });

    it('updates existing script element without appending duplicates', () => {
      const initialData = { name: 'Initial' };
      const updatedData = { name: 'Updated' };

      injectJsonLd('my-id', initialData);
      let scripts = document.querySelectorAll('#json-ld-my-id');
      expect(scripts.length).toBe(1);
      expect(JSON.parse(scripts[0].textContent || '')).toEqual(initialData);

      injectJsonLd('my-id', updatedData);
      scripts = document.querySelectorAll('#json-ld-my-id');
      expect(scripts.length).toBe(1);
      expect(JSON.parse(scripts[0].textContent || '')).toEqual(updatedData);
    });

    it('supports multiple distinct JSON-LD scripts with different IDs', () => {
      injectJsonLd('first', { title: 'First' });
      injectJsonLd('second', { title: 'Second' });

      const script1 = document.getElementById('json-ld-first');
      const script2 = document.getElementById('json-ld-second');

      expect(script1).not.toBeNull();
      expect(script2).not.toBeNull();
      expect(JSON.parse(script1?.textContent || '')).toEqual({ title: 'First' });
      expect(JSON.parse(script2?.textContent || '')).toEqual({ title: 'Second' });
    });
  });

  describe('removeJsonLd', () => {
    it('removes an existing JSON-LD script element from DOM', () => {
      injectJsonLd('to-remove', { key: 'val' });
      expect(document.getElementById('json-ld-to-remove')).not.toBeNull();

      removeJsonLd('to-remove');
      expect(document.getElementById('json-ld-to-remove')).toBeNull();
    });

    it('does not throw when attempting to remove non-existent JSON-LD script', () => {
      expect(() => removeJsonLd('non-existent')).not.toThrow();
    });
  });

  describe('updateMetaTag', () => {
    it('creates a new meta tag when one does not exist', () => {
      updateMetaTag('name', 'description', 'Test description');

      const meta = document.querySelector('meta[name="description"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute('content')).toBe('Test description');
      expect(meta?.parentNode).toBe(document.head);
    });

    it('updates an existing meta tag content attribute', () => {
      updateMetaTag('property', 'og:title', 'Initial Title');
      updateMetaTag('property', 'og:title', 'New Title');

      const metas = document.querySelectorAll('meta[property="og:title"]');
      expect(metas.length).toBe(1);
      expect(metas[0].getAttribute('content')).toBe('New Title');
    });
  });

  describe('updateCanonicalLink', () => {
    it('creates canonical link tag in head if missing', () => {
      updateCanonicalLink('https://bahiaoficios.com/canonical-test');

      const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://bahiaoficios.com/canonical-test');
      expect(link?.parentNode).toBe(document.head);
    });

    it('updates existing canonical link href', () => {
      updateCanonicalLink('https://bahiaoficios.com/page-1');
      updateCanonicalLink('https://bahiaoficios.com/page-2');

      const links = document.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe('https://bahiaoficios.com/page-2');
    });
  });

  describe('getLocalBusinessSchemaType', () => {
    it('returns default schema types when rubro is undefined or empty', () => {
      expect(getLocalBusinessSchemaType()).toEqual(['LocalBusiness', 'ProfessionalService']);
      expect(getLocalBusinessSchemaType('')).toEqual(['LocalBusiness', 'ProfessionalService']);
    });

    it('maps specific trade keywords to appropriate Schema.org types', () => {
      expect(getLocalBusinessSchemaType('Electricista')).toEqual(['Electrician', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Plomero y Gasista')).toEqual(['Plumber', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Techista')).toEqual(['RoofingContractor', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Cerrajería')).toEqual(['Locksmith', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Pintor')).toEqual(['GeneralContractor', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Albañil')).toEqual(['GeneralContractor', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Mecanico')).toEqual(['AutoRepair', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Taller Mecanico')).toEqual(['AutoRepair', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Limpieza')).toEqual(['ProfessionalService', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Abogado')).toEqual(['LegalService', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Contador')).toEqual(['AccountingService', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Otro Oficio')).toEqual(['ProfessionalService', 'LocalBusiness']);
    });
  });

  describe('generateLocalBusinessSchema', () => {
    const mockUser: User = {
      uid: 'user-123',
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      rol: 'profesional',
      ciudad: 'Bahía Blanca',
      zona: 'Centro',
      slug: 'juan-perez',
      fotoUrl: 'https://example.com/avatar.jpg',
      profesionalInfo: {
        rubro: 'Electricista',
        descripcion: 'Electricista matriculado con 10 años de experiencia.',
        isVip: true,
        ratingAvg: 4.8,
        reviewCount: 2,
        telefono: '2914123456',
        precioMinimo: 5000,
        fotoPortada: 'https://example.com/portada.jpg',
        fotosTrabajos: ['https://example.com/job1.jpg'],
        portfolio: [{ url: 'https://example.com/job2.jpg' }, 'https://example.com/job3.jpg'],
        especialidad: 'Instalaciones industriales',
      } as any,
    };

    it('generates valid schema structure for professional', () => {
      const schema = generateLocalBusinessSchema(mockUser);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toEqual(['Electrician', 'LocalBusiness']);
      expect(schema['@id']).toBe('https://bahiaoficios.com/profesional/juan-perez#localbusiness');
      expect(schema.name).toBe('Juan Pérez');
      expect(schema.telephone).toBe('2914123456');
      expect(schema.priceRange).toBe('$5.000+');
      expect(schema.address.streetAddress).toBe('Centro, Bahía Blanca');
      expect(schema.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.8,
        reviewCount: 2,
        bestRating: '5',
        worstRating: '1',
      });
      expect(schema.image).toContain('https://example.com/avatar.jpg');
      expect(schema.image).toContain('https://example.com/portada.jpg');
      expect(schema.image).toContain('https://example.com/job1.jpg');
      expect(schema.image).toContain('https://example.com/job2.jpg');
      expect(schema.image).toContain('https://example.com/job3.jpg');
    });

    it('handles fallback defaults when user info is missing or sparse', () => {
      const sparseUser: User = {
        uid: 'user-456',
        nombre: 'María López',
        email: '',
        fotoUrl: '',
        ciudad: 'Bahía Blanca',
        zona: '',
        rol: 'profesional',
      };

      const schema = generateLocalBusinessSchema(sparseUser);
      expect(schema['@type']).toEqual(['ProfessionalService', 'LocalBusiness']);
      expect(schema['@id']).toBe('https://bahiaoficios.com/profesional/user-456#localbusiness');
      expect(schema.priceRange).toBe('$$');
      expect(schema.address.streetAddress).toBe('Bahía Blanca');
      expect(schema.aggregateRating).toBeUndefined();
      expect(schema.review).toBeUndefined();
    });

    it('includes review list and formats dates properly', () => {
      const reviews: Review[] = [
        {
          id: 'r1',
          profesionalId: 'user-123',
          clienteId: 'c1',
          clienteNombre: 'Carlos',
          rating: 5,
          comentario: 'Excelente trabajo.',
          fecha: new Date('2025-01-15T12:00:00Z'),
        },
        {
          id: 'r2',
          profesionalId: 'user-123',
          clienteId: 'c2',
          clienteNombre: 'Ana',
          rating: 4,
          comentario: 'Muy puntual.',
          fecha: '2025-02-10' as any,
        },
        {
          id: 'r3',
          profesionalId: 'user-123',
          clienteId: 'c3',
          clienteNombre: 'Vecino',
          rating: 5,
          comentario: 'Excelente atención y servicio.',
          fecha: 'invalid-date' as any,
        },
      ];

      const schema = generateLocalBusinessSchema(mockUser, reviews);
      expect(schema.review).toHaveLength(3);
      expect(schema.review[0].author.name).toBe('Carlos');
      expect(schema.review[0].datePublished).toBe('2025-01-15');
      expect(schema.review[1].author.name).toBe('Ana');
      expect(schema.review[1].datePublished).toBe('2025-02-10');
      expect(schema.review[2].author.name).toBe('Vecino');
      expect(schema.review[2].reviewBody).toBe('Excelente atención y servicio.');
    });
  });

  describe('generateProfessionLandingSchema', () => {
    it('generates ItemList schema with professionals', () => {
      const professionals: User[] = [
        {
          uid: 'pro-1',
          nombre: 'Pedro',
          email: 'pedro@test.com',
          fotoUrl: 'https://example.com/pedro.jpg',
          ciudad: 'Bahía Blanca',
          zona: 'Palihue',
          rol: 'profesional',
          slug: 'pedro-plomero',
          profesionalInfo: {
            rubro: 'Plomero',
            descripcion: 'Plomero profesional',
            isVip: false,
            ratingAvg: 5,
            reviewCount: 10,
            fotosTrabajos: [],
          },
        },
      ];

      const schema = generateProfessionLandingSchema('Plomero', professionals);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.name).toBe('Plomeros en Bahía Blanca');
      expect(schema.numberOfItems).toBe(1);
      expect(schema.itemListElement).toHaveLength(1);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].item.name).toBe('Pedro');
      expect(schema.itemListElement[0].item['@type']).toEqual(['Plumber', 'LocalBusiness']);
    });
  });
});
