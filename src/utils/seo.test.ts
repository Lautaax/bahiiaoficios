// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalBusinessSchemaType,
  generateLocalBusinessSchema,
  generateProfessionLandingSchema,
  updateMetaTag,
  updateCanonicalLink,
  injectJsonLd,
  removeJsonLd
} from './seo';
import { User, Review } from '../types';

describe('getLocalBusinessSchemaType', () => {
  it('returns default schema types when rubro is undefined or empty', () => {
    expect(getLocalBusinessSchemaType(undefined)).toEqual(['LocalBusiness', 'ProfessionalService']);
    expect(getLocalBusinessSchemaType('')).toEqual(['LocalBusiness', 'ProfessionalService']);
  });

  it('maps electrician trade keywords correctly', () => {
    expect(getLocalBusinessSchemaType('Electricista Residencial')).toEqual(['Electrician', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('electricidad')).toEqual(['Electrician', 'LocalBusiness']);
  });

  it('maps plumber and gasist trade keywords correctly', () => {
    expect(getLocalBusinessSchemaType('Plomero')).toEqual(['Plumber', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Gasista Matriculado')).toEqual(['Plumber', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Destapaciones')).toEqual(['Plumber', 'LocalBusiness']);
  });

  it('maps roofing trade keywords correctly', () => {
    expect(getLocalBusinessSchemaType('Techista')).toEqual(['RoofingContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Reparación de Techos')).toEqual(['RoofingContractor', 'LocalBusiness']);
  });

  it('maps locksmith trade keywords correctly', () => {
    expect(getLocalBusinessSchemaType('Cerrajería 24hs')).toEqual(['Locksmith', 'LocalBusiness']);
  });

  it('maps painting, masonry and construction trade keywords correctly', () => {
    expect(getLocalBusinessSchemaType('Pintor')).toEqual(['GeneralContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Albañil')).toEqual(['GeneralContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Construcciones en seco')).toEqual(['GeneralContractor', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Reformas de baño')).toEqual(['GeneralContractor', 'LocalBusiness']);
  });

  it('maps auto repair trade keywords correctly', () => {
    expect(getLocalBusinessSchemaType('Mecánico dental')).toEqual(['AutoRepair', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Taller Mecánico')).toEqual(['AutoRepair', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Chapa y pintura')).toEqual(['AutoRepair', 'LocalBusiness']);
    expect(getLocalBusinessSchemaType('Gomería')).toEqual(['AutoRepair', 'LocalBusiness']);
  });

  it('maps cleaning trade keywords correctly', () => {
    expect(getLocalBusinessSchemaType('Limpieza de tapizados')).toEqual(['ProfessionalService', 'LocalBusiness']);
  });

  it('maps legal services correctly', () => {
    expect(getLocalBusinessSchemaType('Abogado laboral')).toEqual(['LegalService', 'LocalBusiness']);
  });

  it('maps accounting services correctly', () => {
    expect(getLocalBusinessSchemaType('Contador público')).toEqual(['AccountingService', 'LocalBusiness']);
  });

  it('defaults unmapped trades to ProfessionalService', () => {
    expect(getLocalBusinessSchemaType('Jardinero')).toEqual(['ProfessionalService', 'LocalBusiness']);
  });
});

describe('generateLocalBusinessSchema', () => {
  const minimalUser: User = {
    uid: 'pro-123',
    nombre: 'Juan Pérez',
    email: '',
    fotoUrl: '',
    rol: 'profesional',
    ciudad: 'Bahía Blanca',
    zona: ''
  };

  it('handles a minimal user object gracefully', () => {
    const schema = generateLocalBusinessSchema(minimalUser);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toEqual(['ProfessionalService', 'LocalBusiness']);
    expect(schema['@id']).toBe('https://bahiaoficios.com/profesional/pro-123#localbusiness');
    expect(schema.name).toBe('Juan Pérez');
    expect(schema.url).toBe('https://bahiaoficios.com/profesional/pro-123');
    expect(schema.priceRange).toBe('$$');
    expect(schema.address.streetAddress).toBe('Bahía Blanca');
    expect(schema.image).toEqual([
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200&h=630'
    ]);
    expect(schema.telephone).toBeUndefined();
    expect(schema.email).toBeUndefined();
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toBeUndefined();
  });

  it('uses slug and custom zone when provided', () => {
    const user: User = {
      ...minimalUser,
      slug: 'juan-perez-electricista',
      zona: 'Patagonia',
      email: 'juan@example.com',
      profesionalInfo: {
        rubro: 'Electricista',
        descripcion: 'Instalaciones eléctricas residenciales',
        isVip: false,
        ratingAvg: 0,
        reviewCount: 0,
        fotosTrabajos: [],
        telefono: '2914123456',
        precioMinimo: 15000,
        especialidad: 'Tableros e iluminación'
      }
    };

    const schema = generateLocalBusinessSchema(user);

    expect(schema['@id']).toBe('https://bahiaoficios.com/profesional/juan-perez-electricista#localbusiness');
    expect(schema.url).toBe('https://bahiaoficios.com/profesional/juan-perez-electricista');
    expect(schema.address.streetAddress).toBe('Patagonia, Bahía Blanca');
    expect(schema.telephone).toBe('2914123456');
    expect(schema.email).toBe('juan@example.com');
    expect(schema.priceRange).toBe('$15.000+');
    expect(schema.knowsAbout).toContain('Tableros e iluminación');
  });

  it('truncates long descriptions to 220 characters', () => {
    const longDesc = 'A'.repeat(300);
    const user: User = {
      ...minimalUser,
      profesionalInfo: {
        rubro: 'Plomero',
        descripcion: longDesc,
        isVip: true,
        ratingAvg: 5,
        reviewCount: 1,
        fotosTrabajos: []
      }
    };

    const schema = generateLocalBusinessSchema(user);
    expect(schema.description).toContain('A'.repeat(220) + '...');
    expect(schema.description).toContain('Servicio profesional de Plomero en Bahía Blanca, Bahía Blanca.');
  });

  it('collects images from all possible sources on professional profile', () => {
    const user: User = {
      ...minimalUser,
      fotoUrl: 'https://example.com/avatar.jpg',
      profesionalInfo: {
        rubro: 'Techista',
        descripcion: 'Servicios de techos',
        isVip: true,
        ratingAvg: 4.8,
        reviewCount: 10,
        fotoPortada: 'https://example.com/portada.jpg',
        portadaUrl: 'https://example.com/portada2.jpg',
        fotosTrabajos: ['https://example.com/trabajo1.jpg', 123 as any],
        portfolio: ['https://example.com/port1.jpg', { url: 'https://example.com/port2.jpg' }, { invalid: true }]
      } as any
    };

    const schema = generateLocalBusinessSchema(user);

    expect(schema.image).toEqual([
      'https://example.com/avatar.jpg',
      'https://example.com/portada.jpg',
      'https://example.com/portada2.jpg',
      'https://example.com/trabajo1.jpg',
      'https://example.com/port1.jpg',
      'https://example.com/port2.jpg'
    ]);
  });

  it('generates AggregateRating from profesionalInfo when specified', () => {
    const user: User = {
      ...minimalUser,
      profesionalInfo: {
        rubro: 'Gasista',
        descripcion: 'Gasista matriculado',
        isVip: true,
        ratingAvg: 4.8666,
        reviewCount: 12,
        fotosTrabajos: []
      }
    };

    const schema = generateLocalBusinessSchema(user);

    expect(schema.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.9,
      reviewCount: 12,
      bestRating: '5',
      worstRating: '1'
    });
  });

  it('calculates AggregateRating from reviews array when profesionalInfo counts are 0', () => {
    const user: User = {
      ...minimalUser,
      profesionalInfo: {
        rubro: 'Pintor',
        descripcion: 'Pintor profesional',
        isVip: false,
        ratingAvg: 0,
        reviewCount: 0,
        fotosTrabajos: []
      }
    };

    const reviews: Review[] = [
      {
        id: 'rev-1',
        profesionalId: 'pro-123',
        clienteId: 'c1',
        rating: 5,
        comentario: 'Excelente',
        fecha: new Date('2024-01-15'),
        clienteNombre: 'Carlos'
      },
      {
        id: 'rev-2',
        profesionalId: 'pro-123',
        clienteId: 'c2',
        rating: 4,
        comentario: 'Muy bueno',
        fecha: new Date('2024-01-20'),
        clienteNombre: 'Ana'
      }
    ];

    const schema = generateLocalBusinessSchema(user, reviews);

    expect(schema.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.5,
      reviewCount: 2,
      bestRating: '5',
      worstRating: '1'
    });
  });

  it('formats individual reviews and handles edge cases in review data', () => {
    const user: User = { ...minimalUser };
    const reviews: Review[] = [
      {
        id: 'r1',
        profesionalId: 'pro-123',
        clienteId: 'c1',
        rating: 5,
        comentario: 'Gran trabajo',
        fecha: new Date('2024-02-10T00:00:00.000Z'),
        clienteNombre: 'Maria'
      },
      {
        id: 'r2',
        profesionalId: 'pro-123',
        clienteId: 'c2',
        rating: 0 as any, // invalid rating fallback to default
        comentario: '', // invalid comment fallback to default
        fecha: '2024-03-01' as any,
        clienteNombre: '',
        usuarioNombre: 'Pedro'
      } as any,
      {
        id: 'r3',
        profesionalId: 'pro-123',
        clienteId: 'c3',
        rating: 4,
        comentario: 'Todo bien',
        fecha: 'fecha-invalida' as any, // invalid date string fallback to present date
        clienteNombre: ''
      } as any
    ];

    const schema = generateLocalBusinessSchema(user, reviews);

    expect(schema.review).toHaveLength(3);

    expect(schema.review[0]).toEqual({
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Maria' },
      datePublished: '2024-02-10',
      reviewBody: 'Gran trabajo',
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: '5', worstRating: '1' }
    });

    expect(schema.review[1]).toEqual({
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Pedro' },
      datePublished: '2024-03-01',
      reviewBody: 'Excelente atención y servicio.',
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: '5', worstRating: '1' }
    });

    expect(schema.review[2].author.name).toBe('Vecino de Bahía Blanca');
    expect(schema.review[2].datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('limits individual reviews schema array to maximum of 5', () => {
    const user: User = { ...minimalUser };
    const reviews: Review[] = Array.from({ length: 8 }, (_, i) => ({
      id: `r-${i}`,
      profesionalId: 'pro-123',
      clienteId: `c-${i}`,
      rating: 5,
      comentario: `Comentario ${i}`,
      fecha: new Date(),
      clienteNombre: `Cliente ${i}`
    }));

    const schema = generateLocalBusinessSchema(user, reviews);
    expect(schema.review).toHaveLength(5);
  });
});

describe('generateProfessionLandingSchema', () => {
  it('generates ItemList schema for profession landing page', () => {
    const professionals: User[] = [
      {
        uid: 'pro-1',
        nombre: 'Mario Plomero',
        email: 'mario@example.com',
        fotoUrl: 'https://example.com/mario.jpg',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Centro',
        slug: 'mario-plomero'
      },
      {
        uid: 'pro-2',
        nombre: 'Luigi Plomero',
        email: 'luigi@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Villa Mitre'
      }
    ];

    const schema = generateProfessionLandingSchema('Plomero', professionals);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('ItemList');
    expect(schema.name).toBe('Plomeros en Bahía Blanca');
    expect(schema.numberOfItems).toBe(2);
    expect(schema.itemListElement).toHaveLength(2);

    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': ['Plumber', 'LocalBusiness'],
        name: 'Mario Plomero',
        url: expect.stringMatching(/\/profesional\/mario-plomero$/),
        image: 'https://example.com/mario.jpg',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Centro',
          addressLocality: 'Bahía Blanca',
          addressRegion: 'Buenos Aires',
          addressCountry: 'AR'
        }
      }
    });

    expect(schema.itemListElement[1].item.url).toMatch(/\/profesional\/pro-2$/);
  });
});

describe('DOM SEO utilities', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('updateMetaTag creates or updates meta tags correctly', () => {
    updateMetaTag('name', 'description', 'Test Description');

    const meta = document.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute('content')).toBe('Test Description');

    updateMetaTag('name', 'description', 'Updated Description');
    const updatedMeta = document.querySelectorAll('meta[name="description"]');
    expect(updatedMeta).toHaveLength(1);
    expect(updatedMeta[0].getAttribute('content')).toBe('Updated Description');
  });

  it('updateCanonicalLink creates or updates canonical link tag', () => {
    updateCanonicalLink('https://bahiaoficios.com/test');

    const link = document.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://bahiaoficios.com/test');

    updateCanonicalLink('https://bahiaoficios.com/updated');
    const updatedLinks = document.querySelectorAll('link[rel="canonical"]');
    expect(updatedLinks).toHaveLength(1);
    expect(updatedLinks[0].getAttribute('href')).toBe('https://bahiaoficios.com/updated');
  });

  it('injectJsonLd and removeJsonLd manage JSON-LD script tags', () => {
    const data = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Bahía Oficios' };

    injectJsonLd('org', data);

    let script = document.getElementById('json-ld-org');
    expect(script).not.toBeNull();
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    expect(JSON.parse(script?.textContent || '{}')).toEqual(data);

    // Updating existing script
    const updatedData = { ...data, name: 'Bahía Oficios Updated' };
    injectJsonLd('org', updatedData);
    script = document.getElementById('json-ld-org');
    expect(JSON.parse(script?.textContent || '{}')).toEqual(updatedData);

    // Removing script
    removeJsonLd('org');
    script = document.getElementById('json-ld-org');
    expect(script).toBeNull();
  });
});
