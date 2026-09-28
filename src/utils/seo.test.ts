// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getLocalBusinessSchemaType,
  generateLocalBusinessSchema,
  updateMetaTag,
  updateCanonicalLink,
  injectJsonLd,
  removeJsonLd,
  generateProfessionLandingSchema,
} from './seo';
import { User, Review } from '../types';

describe('seo utils', () => {
  beforeEach(() => {
    // Clear head and body elements before each test
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('updateCanonicalLink', () => {
    it('creates a new canonical link element in head if none exists', () => {
      const url = 'https://bahiaoficios.com/profesional/juan-perez';
      updateCanonicalLink(url);

      const links = document.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);

      const link = links[0] as HTMLLinkElement;
      expect(link.getAttribute('href')).toBe(url);
      expect(link.getAttribute('rel')).toBe('canonical');
      expect(link.parentNode).toBe(document.head);
    });

    it('updates existing canonical link href without creating duplicates', () => {
      // Pre-create a canonical link element
      const existingLink = document.createElement('link');
      existingLink.setAttribute('rel', 'canonical');
      existingLink.setAttribute('href', 'https://bahiaoficios.com/original');
      document.head.appendChild(existingLink);

      const updatedUrl = 'https://bahiaoficios.com/profesional/juan-perez-updated';
      updateCanonicalLink(updatedUrl);

      const links = document.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe(updatedUrl);
    });
  });

  describe('updateMetaTag', () => {
    it('creates a new meta tag in head if none exists', () => {
      updateMetaTag('name', 'description', 'Servicio de plomería en Bahía Blanca');

      const meta = document.querySelector('meta[name="description"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute('content')).toBe('Servicio de plomería en Bahía Blanca');
      expect(meta?.parentNode).toBe(document.head);
    });

    it('updates content attribute of existing meta tag without creating duplicates', () => {
      updateMetaTag('name', 'description', 'Initial description');
      updateMetaTag('name', 'description', 'Updated description');

      const metas = document.querySelectorAll('meta[name="description"]');
      expect(metas.length).toBe(1);
      expect(metas[0].getAttribute('content')).toBe('Updated description');
    });

    it('handles property attributes correctly for OpenGraph meta tags', () => {
      updateMetaTag('property', 'og:title', 'Juan Pérez | Plomero');

      const meta = document.querySelector('meta[property="og:title"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute('content')).toBe('Juan Pérez | Plomero');
    });
  });

  describe('injectJsonLd & removeJsonLd', () => {
    it('injects a new JSON-LD script element into document head', () => {
      const id = 'test-id';
      const data = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Test' };

      injectJsonLd(id, data);

      const script = document.getElementById(`json-ld-${id}`) as HTMLScriptElement;
      expect(script).not.toBeNull();
      expect(script?.type).toBe('application/ld+json');
      expect(JSON.parse(script.textContent || '')).toEqual(data);
    });

    it('updates existing JSON-LD script element content without duplicating', () => {
      const id = 'test-id';
      injectJsonLd(id, { name: 'Original' });
      injectJsonLd(id, { name: 'Updated' });

      const scripts = document.querySelectorAll(`#json-ld-${id}`);
      expect(scripts.length).toBe(1);
      expect(JSON.parse(scripts[0].textContent || '')).toEqual({ name: 'Updated' });
    });

    it('removes JSON-LD script element from head when removeJsonLd is called', () => {
      const id = 'test-id';
      injectJsonLd(id, { name: 'Test' });
      expect(document.getElementById(`json-ld-${id}`)).not.toBeNull();

      removeJsonLd(id);
      expect(document.getElementById(`json-ld-${id}`)).toBeNull();
    });

    it('handles removeJsonLd gracefully when script tag does not exist', () => {
      expect(() => removeJsonLd('non-existent-id')).not.toThrow();
    });
  });

  describe('getLocalBusinessSchemaType', () => {
    it('returns default schema types when rubro is missing or undefined', () => {
      expect(getLocalBusinessSchemaType()).toEqual(['LocalBusiness', 'ProfessionalService']);
      expect(getLocalBusinessSchemaType('')).toEqual(['LocalBusiness', 'ProfessionalService']);
    });

    it('maps trade names to appropriate Schema.org types', () => {
      expect(getLocalBusinessSchemaType('Electricista')).toEqual(['Electrician', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Plomero y Gasista')).toEqual(['Plumber', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Techista')).toEqual(['RoofingContractor', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Cerrajero')).toEqual(['Locksmith', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Pintor')).toEqual(['GeneralContractor', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Albañilería')).toEqual(['GeneralContractor', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Taller Mecánico')).toEqual(['AutoRepair', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Servicios de Limpieza')).toEqual(['ProfessionalService', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Abogado')).toEqual(['LegalService', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Contador Público')).toEqual(['AccountingService', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Jardinero')).toEqual(['ProfessionalService', 'LocalBusiness']);
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
      fotoUrl: 'https://example.com/foto.jpg',
      profesionalInfo: {
        rubro: 'Electricista',
        descripcion: 'Electricista matriculado en Bahía Blanca',
        isVip: false,
        telefono: '+542911234567',
        precioMinimo: 5000,
        especialidad: 'Instalaciones industriales',
        fotoPortada: 'https://example.com/portada.jpg',
        fotosTrabajos: ['https://example.com/trabajo1.jpg'],
        portfolio: [{ url: 'https://example.com/portfolio1.jpg' }],
        ratingAvg: 4.8,
        reviewCount: 10,
      } as any,
    };

    it('generates schema object with complete professional details', () => {
      const schema = generateLocalBusinessSchema(mockUser);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toEqual(['Electrician', 'LocalBusiness']);
      expect(schema['name']).toBe('Juan Pérez');
      expect(schema['url']).toBe('https://bahiaoficios.com/profesional/juan-perez');
      expect(schema['telephone']).toBe('+542911234567');
      expect(schema['email']).toBe('juan@example.com');
      expect(schema['address']['addressLocality']).toBe('Bahía Blanca');
      expect(schema['aggregateRating']).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.8,
        reviewCount: 10,
        bestRating: '5',
        worstRating: '1',
      });
    });

    it('includes reviews in schema when provided', () => {
      const reviews: Review[] = [
        {
          id: 'rev-1',
          profesionalId: 'user-123',
          clienteId: 'cli-1',
          clienteNombre: 'Maria G.',
          rating: 5,
          comentario: 'Excelente trabajo',
          fecha: new Date('2024-01-15'),
        },
      ];

      const schema = generateLocalBusinessSchema(mockUser, reviews);

      expect(schema.review).toHaveLength(1);
      expect(schema.review[0]).toEqual({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: 'Maria G.',
        },
        datePublished: '2024-01-15',
        reviewBody: 'Excelente trabajo',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: 5,
          bestRating: '5',
          worstRating: '1',
        },
      });
    });

    it('fallback gracefully when user has minimal details', () => {
      const minimalUser: User = {
        uid: 'user-456',
        nombre: 'Pedro Solís',
        email: 'pedro@example.com',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Centro',
        fotoUrl: '',
      };

      const schema = generateLocalBusinessSchema(minimalUser);

      expect(schema['name']).toBe('Pedro Solís');
      expect(schema['url']).toBe('https://bahiaoficios.com/profesional/user-456');
      expect(schema['image']).toEqual(['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200&h=630']);
      expect(schema.aggregateRating).toBeUndefined();
    });
  });

  describe('generateProfessionLandingSchema', () => {
    it('generates ItemList schema for profession page', () => {
      const professionals: User[] = [
        {
          uid: 'pro-1',
          nombre: 'Carlos López',
          email: 'carlos@example.com',
          rol: 'profesional',
          ciudad: 'Bahía Blanca',
          zona: 'Centro',
          fotoUrl: '',
          slug: 'carlos-lopez',
          profesionalInfo: {
            rubro: 'Plomero',
            descripcion: 'Plomero profesional',
            isVip: false,
            ratingAvg: 5,
            reviewCount: 1,
            fotosTrabajos: [],
          },
        },
      ];

      const schema = generateProfessionLandingSchema('Plomero', professionals);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema['name']).toBe('Plomeros en Bahía Blanca');
      expect(schema['numberOfItems']).toBe(1);
      expect(schema['itemListElement'][0].position).toBe(1);
      expect(schema['itemListElement'][0].item.name).toBe('Carlos López');
    });
  });
});
