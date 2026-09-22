import { User, Review } from '../types';

/**
 * Maps common trade names in Bahía Blanca to standard Schema.org LocalBusiness sub-types.
 */
export function getLocalBusinessSchemaType(rubro?: string): string[] {
  if (!rubro) return ['LocalBusiness', 'ProfessionalService'];
  const r = rubro.toLowerCase();

  const types = ['LocalBusiness'];

  if (r.includes('electric')) {
    types.unshift('Electrician');
  } else if (r.includes('plomer') || r.includes('gasist') || r.includes('destapacion')) {
    types.unshift('Plumber');
  } else if (r.includes('tech') || r.includes('techo')) {
    types.unshift('RoofingContractor');
  } else if (r.includes('cerraj')) {
    types.unshift('Locksmith');
  } else if (r.includes('pint')) {
    types.unshift('GeneralContractor');
  } else if (r.includes('albañ') || r.includes('construc') || r.includes('reforma')) {
    types.unshift('GeneralContractor');
  } else if (r.includes('mecanic') || r.includes('taller') || r.includes('chapa') || r.includes('gomer')) {
    types.unshift('AutoRepair');
  } else if (r.includes('limp') || r.includes('limpieza')) {
    types.unshift('ProfessionalService');
  } else if (r.includes('abog')) {
    types.unshift('LegalService');
  } else if (r.includes('contad')) {
    types.unshift('AccountingService');
  } else {
    types.unshift('ProfessionalService');
  }

  return types;
}

/**
 * Generates a complete Schema.org LocalBusiness structured data object
 * tailored specifically for Bahía Blanca professionals.
 */
export function generateLocalBusinessSchema(
  professional: User,
  reviews: Review[] = []
): Record<string, any> {
  const info = professional.profesionalInfo || ({} as any);
  const rubro = info.rubro || 'Oficio General';
  const zona = professional.zona || 'Bahía Blanca';
  const slugOrId = professional.slug || professional.uid;
  const canonicalUrl = `https://bahiaoficios.com/profesional/${slugOrId}`;

  // Collect images
  const images: string[] = [];
  if (professional.fotoUrl) images.push(professional.fotoUrl);
  if (info.fotoPortada) images.push(info.fotoPortada);
  if ((info as any).portadaUrl) images.push((info as any).portadaUrl);
  if (Array.isArray(info.fotosTrabajos)) {
    info.fotosTrabajos.forEach((url: string) => {
      if (typeof url === 'string') images.push(url);
    });
  }
  if (Array.isArray((info as any).portfolio)) {
    (info as any).portfolio.forEach((p: any) => {
      const url = typeof p === 'string' ? p : p?.url;
      if (url && typeof url === 'string') images.push(url);
    });
  }

  const defaultImage = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200&h=630';
  const mainImage = images.length > 0 ? images[0] : defaultImage;

  // Build localized description
  const description = info.descripcion 
    ? `${info.descripcion.slice(0, 220)}... Servicio profesional de ${rubro} en ${zona}, Bahía Blanca.`
    : `Servicio profesional y presupuestos de ${rubro} en ${zona}, Bahía Blanca. Contacto directo por WhatsApp y calificaciones reales de vecinos.`;

  // Base Schema object
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': getLocalBusinessSchemaType(rubro),
    '@id': `${canonicalUrl}#localbusiness`,
    name: professional.nombre,
    url: canonicalUrl,
    image: images.length > 0 ? images : [defaultImage],
    description,
    telephone: info.telefono || undefined,
    email: professional.email || undefined,
    priceRange: info.precioMinimo ? `$${Number(info.precioMinimo).toLocaleString('es-AR')}+` : '$$',
    currenciesAccepted: 'ARS',
    paymentAccepted: 'Efectivo, Transferencia Bancaria, Mercado Pago',
    address: {
      '@type': 'PostalAddress',
      streetAddress: zona !== 'Bahía Blanca' ? `${zona}, Bahía Blanca` : 'Bahía Blanca',
      addressLocality: 'Bahía Blanca',
      addressRegion: 'Buenos Aires',
      postalCode: 'B8000',
      addressCountry: 'AR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -38.7183,
      longitude: -62.2663
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'Bahía Blanca',
        sameAs: 'https://es.wikipedia.org/wiki/Bah%C3%ADa_Blanca'
      },
      {
        '@type': 'City',
        name: 'Ingeniero White'
      },
      {
        '@type': 'City',
        name: 'General Daniel Cerri'
      },
      {
        '@type': 'City',
        name: 'Punta Alta'
      }
    ],
    knowsAbout: [
      rubro,
      `Servicios de ${rubro}`,
      `Reparaciones en Bahía Blanca`,
      info.especialidad || `${rubro} matriculado o verificado`
    ].filter(Boolean)
  };

  // Add AggregateRating if valid reviews exist
  const reviewCount = Number(info.reviewCount) || reviews.length;
  const ratingAvg = Number(info.ratingAvg) || (reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length 
    : 0);

  if (reviewCount > 0 && ratingAvg > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(ratingAvg.toFixed(1)),
      reviewCount: reviewCount,
      bestRating: '5',
      worstRating: '1'
    };
  }

  // Add individual reviews (up to 5 recent reviews)
  if (reviews && reviews.length > 0) {
    schema.review = reviews.slice(0, 5).map((rev) => {
      let publishedDate: string = new Date().toISOString().split('T')[0];
      try {
        if (rev.fecha instanceof Date) {
          publishedDate = rev.fecha.toISOString().split('T')[0];
        } else if (typeof rev.fecha === 'string') {
          publishedDate = new Date(rev.fecha).toISOString().split('T')[0];
        }
      } catch {
        // use default
      }

      return {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: rev.clienteNombre || (rev as any).usuarioNombre || 'Vecino de Bahía Blanca'
        },
        datePublished: publishedDate,
        reviewBody: rev.comentario || 'Excelente atención y servicio.',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: rev.rating || 5,
          bestRating: '5',
          worstRating: '1'
        }
      };
    });
  }

  return schema;
}

/**
 * Utility to dynamically update head meta tags without requiring react-helmet
 */
export function updateMetaTag(attributeName: string, attributeValue: string, content: string): void {
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Utility to update or insert canonical link
 */
export function updateCanonicalLink(url: string): void {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * Injects or updates a JSON-LD script tag in the document <head>
 */
export function injectJsonLd(id: string, data: Record<string, any>): void {
  const scriptId = `json-ld-${id}`;
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
}

/**
 * Removes a previously injected JSON-LD script from the document <head>
 */
export function removeJsonLd(id: string): void {
  const scriptId = `json-ld-${id}`;
  const script = document.getElementById(scriptId);
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
}

/**
 * Generates an ItemList Schema.org structured data for profession directory pages in Bahía Blanca
 */
export function generateProfessionLandingSchema(
  professionName: string,
  professionals: User[]
): Record<string, any> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://bahiaoficios.com';
  const slug = professionName.toLowerCase().replace(/\s+/g, '-');
  const url = `${currentOrigin}/profesion/${slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${professionName}s en Bahía Blanca`,
    description: `Directorio de profesionales verificados de ${professionName} en Bahía Blanca. Presupuestos y calificaciones reales.`,
    url,
    numberOfItems: professionals.length,
    itemListElement: professionals.map((pro, index) => {
      const proUrl = `${currentOrigin}/profesional/${pro.slug || pro.uid}`;
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': getLocalBusinessSchemaType(pro.profesionalInfo?.rubro || professionName),
          name: pro.nombre,
          url: proUrl,
          image: pro.fotoUrl || pro.profesionalInfo?.fotoPortada || (pro.profesionalInfo as any)?.portadaUrl,
          address: {
            '@type': 'PostalAddress',
            streetAddress: pro.zona || 'Bahía Blanca',
            addressLocality: 'Bahía Blanca',
            addressRegion: 'Buenos Aires',
            addressCountry: 'AR'
          }
        }
      };
    })
  };
}
