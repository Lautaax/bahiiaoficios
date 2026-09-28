import { describe, it, expect } from 'vitest';
import {
  getLocalBusinessSchemaType,
  generateLocalBusinessSchema,
  generateProfessionLandingSchema
} from './seo';
import { User, Review } from '../types';

describe('getLocalBusinessSchemaType', () => {
  it('should return default types when rubro is undefined or empty', () => {
    expect(getLocalBusinessSchemaType()).toEqual(['LocalBusiness', 'ProfessionalService']);
    expect(getLocalBusinessSchemaType('')).toEqual(['LocalBusiness', 'ProfessionalService']);
  });

  it('should return Electrician schema type for electrical trades', () => {
    expect(getLocalBusinessSchemaType('Electricista')).toEqual(['Electrician', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Servicios electricos')).toEqual(['Electrician', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('ELECTRICISTA MATRICULADO')).toEqual(['Electrician', 'LocalBusiness']);
  });

  it('should return Plumber schema type for plumbing, gas, and unblocking trades', () => {
    expect(getLocalBusinessSchemaType('Plomero')).toEqual(['Plumber', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Gasista matriculado')).toEqual(['Plumber', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Destapaciones')).toEqual(['Plumber', 'LocalBusiness']);
  });

  it('should return RoofingContractor schema type for roofing trades', () => {
    expect(getLocalBusinessSchemaType('Techista')).toEqual(['RoofingContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Reparación de Techo')).toEqual(['RoofingContractor', 'LocalBusiness']);
  });

  it('should return Locksmith schema type for locksmith trades', () => {
    expect(getLocalBusinessSchemaType('Cerrajero')).toEqual(['Locksmith', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Cerrajería 24hs')).toEqual(['Locksmith', 'LocalBusiness']);
  });

  it('should return GeneralContractor schema type for painters', () => {
    expect(getLocalBusinessSchemaType('Pintor')).toEqual(['GeneralContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Pintura en general')).toEqual(['GeneralContractor', 'LocalBusiness']);
  });

  it('should return GeneralContractor schema type for masonry, construction, and renovation trades', () => {
    expect(getLocalBusinessSchemaType('Albañil')).toEqual(['GeneralContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Construcción en seco')).toEqual(['GeneralContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Reformas integrales')).toEqual(['GeneralContractor', 'LocalBusiness']);
  });

  it('should return AutoRepair schema type for auto repair, workshops, bodywork, and tire repair', () => {
    expect(getLocalBusinessSchemaType('Mecánico')).toEqual(['AutoRepair', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Taller mecánico')).toEqual(['AutoRepair', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Chapa y pintura')).toEqual(['AutoRepair', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Gomería')).toEqual(['AutoRepair', 'LocalBusiness']);
  });

  it('should return ProfessionalService schema type for cleaning services', () => {
    expect(getLocalBusinessSchemaType('Limpieza de casas')).toEqual(['ProfessionalService', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Limpia vidrios')).toEqual(['ProfessionalService', 'LocalBusiness']);
  });

  it('should return LegalService schema type for lawyers and legal professionals', () => {
    expect(getLocalBusinessSchemaType('Abogado')).toEqual(['LegalService', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Estudio Jurídico Abogados')).toEqual(['LegalService', 'LocalBusiness']);
  });

  it('should return AccountingService schema type for accountants', () => {
    expect(getLocalBusinessSchemaType('Contador')).toEqual(['AccountingService', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Contaduría pública')).toEqual(['AccountingService', 'LocalBusiness']);
  });

  it('should return ProfessionalService fallback for unknown or unlisted trades', () => {
    expect(getLocalBusinessSchemaType('Carpintero')).toEqual(['ProfessionalService', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Jardinero')).toEqual(['ProfessionalService', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Fletes y mudanzas')).toEqual(['ProfessionalService', 'LocalBusiness']);
  });

  it('should handle whitespace and mixed case correctly', () => {
    expect(getLocalBusinessSchemaType('  PLOMERO  ')).toEqual(['Plumber', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('aLbaÑiL')).toEqual(['GeneralContractor', 'LocalBusiness']);
  });
});

describe('generateLocalBusinessSchema', () => {
  const mockProfessional: User = {
    uid: 'pro-123',
    email: 'pro@example.com',
    nombre: 'Juan Pérez',
    rol: 'profesional',
    ciudad: 'Bahía Blanca',
    zona: 'Centro',
    fotoUrl: 'https://example.com/foto.jpg',
    slug: 'juan-perez-plomero',
    profesionalInfo: {
      rubro: 'Plomero',
      descripcion: 'Plomero profesional con 10 años de experiencia.',
      isVip: false,
      telefono: '2911234567',
      ratingAvg: 4.8,
      reviewCount: 10,
      fotoPortada: 'https://example.com/portada.jpg',
      fotosTrabajos: ['https://example.com/trabajo1.jpg']
    }
  };

  const mockReviews: Review[] = [
    {
      id: 'rev-1',
      profesionalId: 'pro-123',
      clienteId: 'client-1',
      clienteNombre: 'María Gómez',
      rating: 5,
      comentario: 'Excelente servicio, muy puntual.',
      fecha: new Date('2025-01-15')
    }
  ];

  it('should generate valid LocalBusiness JSON-LD structure', () => {
    const schema = generateLocalBusinessSchema(mockProfessional, mockReviews);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toEqual(['Plumber', 'LocalBusiness']);
    expect(schema.name).toBe('Juan Pérez');
    expect(schema.url).toBe('https://bahiaoficios.com/profesional/juan-perez-plomero');
    expect(schema.telephone).toBe('2911234567');
    expect(schema.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.8,
      reviewCount: 10,
      bestRating: '5',
      worstRating: '1'
    });
    expect(schema.review).toHaveLength(1);
    expect(schema.review[0].author.name).toBe('María Gómez');
    expect(schema.review[0].reviewRating.ratingValue).toBe(5);
  });

  it('should fallback gracefully when optional professional fields are missing', () => {
    const minimalPro: User = {
      uid: 'pro-minimal',
      email: 'min@example.com',
      nombre: 'Pedro',
      rol: 'profesional',
      ciudad: 'Bahía Blanca',
      zona: 'Bahía Blanca',
      fotoUrl: ''
    };

    const schema = generateLocalBusinessSchema(minimalPro, []);

    expect(schema['@type']).toEqual(['ProfessionalService', 'LocalBusiness']);
    expect(schema.name).toBe('Pedro');
    expect(schema.priceRange).toBe('$$');
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toBeUndefined();
  });
});

describe('generateProfessionLandingSchema', () => {
  it('should generate ItemList schema for profession landing page', () => {
    const professionals: User[] = [
      {
        uid: '1',
        email: 'p1@example.com',
        nombre: 'Pro Uno',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Centro',
        fotoUrl: 'https://example.com/p1.jpg',
        slug: 'pro-uno',
        profesionalInfo: {
          rubro: 'Electricista',
          descripcion: 'Electricista matriculado',
          isVip: false,
          ratingAvg: 5,
          reviewCount: 1,
          fotosTrabajos: []
        }
      }
    ];

    const schema = generateProfessionLandingSchema('Electricista', professionals);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('ItemList');
    expect(schema.name).toBe('Electricistas en Bahía Blanca');
    expect(schema.numberOfItems).toBe(1);
    expect(schema.itemListElement[0].item.name).toBe('Pro Uno');
    expect(schema.itemListElement[0].item['@type']).toEqual(['Electrician', 'LocalBusiness']);
  });
});
