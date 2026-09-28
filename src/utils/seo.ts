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

/**
 * Trade specific FAQ answers that give Google rich FAQ accordions on search results
 */
export function getProfessionFaqs(professionName: string): { question: string; answer: string }[] {
  const norm = professionName.toLowerCase();

  if (norm.includes('plomer')) {
    return [
      {
        question: '¿Cuánto cuesta un servicio de plomero en Bahía Blanca?',
        answer: 'El costo varía según el tipo de trabajo (reparación de canillas, destapaciones cloacales con máquina, instalación de termotanques o cañerías termofusión). En Bahía Oficios podés pedir presupuestos sin cargo y comparar opciones.'
      },
      {
        question: '¿Hacen destapaciones cloacales de urgencia en Bahía Blanca?',
        answer: 'Sí, varios plomeros registrados cuentan con máquinas desobstructoras de resorte y atienden urgencias las 24 horas en todos los barrios bahienses.'
      },
      {
        question: '¿Qué información conviene dar al plomero para cotizar?',
        answer: 'Es útil enviar fotos o video del problema, indicar el barrio o zona de Bahía Blanca y si ya disponés de los repuestos o debe proveerlos el profesional.'
      }
    ];
  }

  if (norm.includes('gasist')) {
    return [
      {
        question: '¿Por qué es indispensable contratar un Gasista Matriculado en Bahía Blanca?',
        answer: 'Por seguridad familiar y normativa legal ante Camuzzi Gas del Sur. Solo los matriculados pueden presentar planos, realizar pruebas de hermeticidad certificadas y tramitar rehabilitación del servicio.'
      },
      {
        question: '¿Qué trámites de gas se realizan con mayor frecuencia?',
        answer: 'Instalación y conexión de cocinas, calefactores tiro balanceado, termotanques, calderas, detección de pérdidas y habilitaciones reglamentarias de medidor.'
      },
      {
        question: '¿Cómo verificar la matrícula de un gasista en Bahía Blanca?',
        answer: 'En su perfil de Bahía Oficios podés verificar si cuenta con matrícula verificada y su categoría (1ª, 2ª o 3ª categoría) según el porte de la instalación.'
      }
    ];
  }

  if (norm.includes('electric')) {
    return [
      {
        question: '¿Qué trabajos realiza un electricista en Bahía Blanca?',
        answer: 'Reparación de cortocircuitos, recableado general bajo norma IRAM, instalación de disyuntores y térmicas, armado de pilares de luz reglamentarios para EDES y colocación de artefactos de iluminación.'
      },
      {
        question: '¿Tienen servicio de electricista para urgencias 24 horas?',
        answer: 'Sí, contamos con electricistas de guardia para solucionar cortes de luz, recalentamiento de cables y tableros principales en Bahía Blanca de día y de noche.'
      },
      {
        question: '¿El electricista otorga certificado de instalación para EDES?',
        answer: 'Los electricistas matriculados emiten el Certificado de Aptitud Eléctrica (CAE) requerido por la distribuidora eléctrica EDES para la bajada de medidores nuevos.'
      }
    ];
  }

  if (norm.includes('tech') || norm.includes('techo')) {
    return [
      {
        question: '¿Qué problemas resuelven los techistas en Bahía Blanca?',
        answer: 'Reparación de filtraciones y goteras, colocación de chapas cincalum o trapezoidales, impermeabilización con membrana asfáltica, zinguería a medida, limpieza de canaletas y armado de tirantes o estructuras metálicas.'
      },
      {
        question: '¿Cómo solucionar el levantamiento de chapas por los vientos de Bahía Blanca?',
        answer: 'Los techistas refuerzan el clavado y atornillado con tornillos autoperforantes y arandelas de neopreno con fijación directa a perfiles C o tirantes reforzados.'
      },
      {
        question: '¿Qué garantía ofrecen los techistas tras reparar una gotera?',
        answer: 'Los profesionales suelen realizar pruebas de lluvia artificial con manguera y brindan garantía por escrito para la temporada invernal.'
      }
    ];
  }

  if (norm.includes('material') || norm.includes('corral')) {
    return [
      {
        question: '¿Qué materiales de construcción puedo cotizar en Bahía Blanca?',
        answer: 'Arena fina y gruesa por bolsón, piedra partida, cemento Loma Negra o Avellaneda, cal, ladrillos huecos y comunes, hierros para losas, viguetas pretensadas y perfiles C.'
      },
      {
        question: '¿Los corralones hacen flete con grúa o pluma a domicilio?',
        answer: 'Sí, la mayoría de los corralones asociados en Bahía Oficios ofrecen entrega directa en obra con camión hidrogrúa en toda Bahía Blanca, Ingeniero White, Cerri y Punta Alta.'
      },
      {
        question: '¿Hay descuentos para profesionales y compras al por mayor?',
        answer: 'Sí, registrándote en Bahía Oficios podés acceder a descuentos gremiales del 5% al 15% en corralones y ferreterías industriales bahienses.'
      }
    ];
  }

  return [
    {
      question: `¿Cómo pedir presupuesto a un ${professionName} en Bahía Blanca?`,
      answer: `Podés contactar directamente por WhatsApp al ${professionName} desde su perfil en Bahía Oficios sin registrarte ni pagar comisión.`
    },
    {
      question: `¿Los ${professionName}s trabajan en todos los barrios de Bahía Blanca?`,
      answer: `Sí, cubren barrios como Centro, Macrocentro, Villa Mitre, Universitario, Patagonia, Palihue, Ing. White y alrededores.`
    }
  ];
}

/**
 * Generates FAQPage schema for specific trades
 */
export function generateProfessionFaqSchema(professionName: string): Record<string, any> {
  const faqs = getProfessionFaqs(professionName);

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

