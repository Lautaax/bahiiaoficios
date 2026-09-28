import { describe, it, expect } from 'vitest';
import {
  generateProfessionLandingSchema,
  getLocalBusinessSchemaType,
  generateLocalBusinessSchema,
} from './seo';
import { User, Review } from '../types';

describe('seo utils', () => {
  describe('generateProfessionLandingSchema', () => {
    it('should handle empty professionals array correctly', () => {
      const result = generateProfessionLandingSchema('Electricista', []);

      expect(result).toEqual({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Electricistas en Bahía Blanca',
        description:
          'Directorio de profesionales verificados de Electricista en Bahía Blanca. Presupuestos y calificaciones reales.',
        url: expect.stringMatching(/\/profesion\/electricista$/),
        numberOfItems: 0,
        itemListElement: [],
      });
    });

    it('should generate schema with professionals', () => {
      const mockProfessionals: Partial<User>[] = [
        {
          uid: 'user-1',
          nombre: 'Juan Pérez',
          slug: 'juan-perez',
          fotoUrl: 'https://example.com/juan.jpg',
          zona: 'Centro',
          profesionalInfo: {
            rubro: 'Electricista',
            isVip: true,
            rubros: ['Electricista'],
          } as any,
        },
        {
          uid: 'user-2',
          nombre: 'Carlos Gómez',
          zona: 'Palihue',
          profesionalInfo: {
            rubro: 'Electricista',
          } as any,
        },
      ];

      const result = generateProfessionLandingSchema('Electricista', mockProfessionals as User[]);

      expect(result.numberOfItems).toBe(2);
      expect(result.itemListElement).toHaveLength(2);

      expect(result.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': ['Electrician', 'LocalBusiness'],
          name: 'Juan Pérez',
          url: expect.stringContaining('/profesional/juan-perez'),
          image: 'https://example.com/juan.jpg',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Centro',
            addressLocality: 'Bahía Blanca',
            addressRegion: 'Buenos Aires',
            addressCountry: 'AR',
          },
        },
      });

      // User 2 uses uid fallback for slug and default zone fallback
      expect(result.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        item: {
          '@type': ['Electrician', 'LocalBusiness'],
          name: 'Carlos Gómez',
          url: expect.stringContaining('/profesional/user-2'),
          image: undefined,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Palihue',
            addressLocality: 'Bahía Blanca',
            addressRegion: 'Buenos Aires',
            addressCountry: 'AR',
          },
        },
      });
    });
  });

  describe('getLocalBusinessSchemaType', () => {
    it('should return default types when rubro is undefined', () => {
      expect(getLocalBusinessSchemaType()).toEqual(['LocalBusiness', 'ProfessionalService']);
    });

    it('should return Electrician for electrical rubros', () => {
      expect(getLocalBusinessSchemaType('Electricista maticulado')).toEqual(['Electrician', 'LocalBusiness']);
    });

    it('should return Plumber for plumbing / gasist / destapacion rubros', () => {
      expect(getLocalBusinessSchemaType('Plomero y Gasista')).toEqual(['Plumber', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Destapaciones 24hs')).toEqual(['Plumber', 'LocalBusiness']);
    });

    it('should return RoofingContractor for roofing', () => {
      expect(getLocalBusinessSchemaType('Techista')).toEqual(['RoofingContractor', 'LocalBusiness']);
    });

    it('should return Locksmith for cerrajero', () => {
      expect(getLocalBusinessSchemaType('Cerrajería urgente')).toEqual(['Locksmith', 'LocalBusiness']);
    });

    it('should return GeneralContractor for pintor or albañil', () => {
      expect(getLocalBusinessSchemaType('Pintor profesional')).toEqual(['GeneralContractor', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Albañilería y reformas')).toEqual(['GeneralContractor', 'LocalBusiness']);
    });

    it('should return AutoRepair for mechanic', () => {
      expect(getLocalBusinessSchemaType('Taller Mecánico')).toEqual(['AutoRepair', 'LocalBusiness']);
    });

    it('should return LegalService and AccountingService', () => {
      expect(getLocalBusinessSchemaType('Abogado laboral')).toEqual(['LegalService', 'LocalBusiness']);
      expect(getLocalBusinessSchemaType('Contador público')).toEqual(['AccountingService', 'LocalBusiness']);
    });

    it('should fallback to ProfessionalService for unknown rubro', () => {
      expect(getLocalBusinessSchemaType('Jardinero')).toEqual(['ProfessionalService', 'LocalBusiness']);
    });
  });

  describe('generateLocalBusinessSchema', () => {
    it('should generate local business schema with minimal professional data', () => {
      const mockUser: Partial<User> = {
        uid: 'pro-100',
        nombre: 'Mario Rossi',
      };

      const result = generateLocalBusinessSchema(mockUser as User);

      expect(result['@context']).toBe('https://schema.org');
      expect(result.name).toBe('Mario Rossi');
      expect(result.url).toBe('https://bahiaoficios.com/profesional/pro-100');
      expect(result.priceRange).toBe('$$');
      expect(result.aggregateRating).toBeUndefined();
      expect(result.review).toBeUndefined();
    });

    it('should generate schema with full profile data and reviews', () => {
      const mockUser: Partial<User> = {
        uid: 'pro-200',
        nombre: 'Ana López',
        slug: 'ana-lopez',
        email: 'ana@example.com',
        fotoUrl: 'https://example.com/ana.jpg',
        zona: 'Villa Mitre',
        profesionalInfo: {
          rubro: 'Plomero',
          telefono: '2911234567',
          precioMinimo: 5000,
          descripcion: 'Servicio de plomería integral con más de 10 años de experiencia en Bahía Blanca.',
          fotoPortada: 'https://example.com/portada.jpg',
          fotosTrabajos: ['https://example.com/trabajo1.jpg'],
          especialidad: 'Plomero matriculado',
          ratingAvg: 4.8,
          reviewCount: 2,
        } as any,
      };

      const mockReviews: Partial<Review>[] = [
        {
          id: 'rev-1',
          clienteNombre: 'Pedro',
          rating: 5,
          comentario: 'Excelente trabajo',
          fecha: new Date('2025-01-15T10:00:00Z'),
        },
        {
          id: 'rev-2',
          clienteNombre: 'Maria',
          rating: 4.5,
          comentario: 'Muy puntual',
          fecha: '2025-01-20T10:00:00Z',
        },
      ];

      const result = generateLocalBusinessSchema(mockUser as User, mockReviews as Review[]);

      expect(result['@type']).toEqual(['Plumber', 'LocalBusiness']);
      expect(result.name).toBe('Ana López');
      expect(result.telephone).toBe('2911234567');
      expect(result.email).toBe('ana@example.com');
      expect(result.priceRange).toBe('$5.000+');
      expect(result.image).toContain('https://example.com/ana.jpg');
      expect(result.image).toContain('https://example.com/portada.jpg');
      expect(result.image).toContain('https://example.com/trabajo1.jpg');

      expect(result.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.8,
        reviewCount: 2,
        bestRating: '5',
        worstRating: '1',
      });

      expect(result.review).toHaveLength(2);
      expect(result.review[0].author.name).toBe('Pedro');
      expect(result.review[0].datePublished).toBe('2025-01-15');
      expect(result.review[1].author.name).toBe('Maria');
      expect(result.review[1].datePublished).toBe('2025-01-20');
    });
  });
});
