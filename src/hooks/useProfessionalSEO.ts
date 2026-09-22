import { useEffect } from 'react';
import { User, Review } from '../types';
import { 
  generateLocalBusinessSchema, 
  updateMetaTag, 
  updateCanonicalLink, 
  injectJsonLd, 
  removeJsonLd 
} from '../utils/seo';

export function useProfessionalSEO(professional: User | null, reviews: Review[] = []): void {
  useEffect(() => {
    if (!professional) return;

    const info = professional.profesionalInfo || ({} as any);
    const rubro = info.rubro || 'Profesional';
    const zona = professional.zona || 'Bahía Blanca';
    const slugOrId = professional.slug || professional.uid;
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://bahiaoficios.com';
    const canonicalUrl = `${currentOrigin}/profesional/${slugOrId}`;

    // Store original document title and description to restore on unmount
    const previousTitle = document.title;
    const existingMetaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const existingOgTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const existingOgDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    const existingOgImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const existingCanonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';

    // Optimized Title & Description targeting Bahía Blanca searches
    const pageTitle = `${professional.nombre} | ${rubro} en Bahía Blanca (${zona}) - Bahía Oficios`;
    const ratingText = info.ratingAvg && info.reviewCount ? ` ⭐ ${Number(info.ratingAvg).toFixed(1)} (${info.reviewCount} opiniones).` : '';
    const priceText = info.precioMinimo ? ` Presupuestos desde $${Number(info.precioMinimo).toLocaleString('es-AR')}.` : ' Presupuesto sin cargo.';
    const metaDescription = `${professional.nombre}, ${rubro} en Bahía Blanca (${zona}).${ratingText}${priceText} Contactá por WhatsApp, conocé trabajos realizados y opiniones reales de vecinos en Bahía Oficios.`;

    // Best image for social preview
    const ogImage = professional.fotoUrl || info.portadaUrl || `${currentOrigin}/icon.svg`;

    // 1. Update Title
    document.title = pageTitle;

    // 2. Standard Meta Tags
    updateMetaTag('name', 'description', metaDescription);
    updateMetaTag('name', 'keywords', `${rubro} bahia blanca, ${rubro} ${zona}, contratar ${rubro} bahia blanca, presupuesto ${rubro}, profesional verificado ${rubro}, ${professional.nombre}, bahia oficios`);
    updateMetaTag('name', 'robots', 'index, follow');

    // 3. OpenGraph Tags
    updateMetaTag('property', 'og:type', 'profile');
    updateMetaTag('property', 'og:title', pageTitle);
    updateMetaTag('property', 'og:description', metaDescription);
    updateMetaTag('property', 'og:image', ogImage);
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('property', 'og:site_name', 'Bahía Oficios');
    updateMetaTag('property', 'og:locale', 'es_AR');

    // 4. Twitter Tags
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', pageTitle);
    updateMetaTag('name', 'twitter:description', metaDescription);
    updateMetaTag('name', 'twitter:image', ogImage);

    // 5. Canonical Link
    updateCanonicalLink(canonicalUrl);

    // 6. Schema.org JSON-LD LocalBusiness Structured Data
    const schemaData = generateLocalBusinessSchema(professional, reviews);
    injectJsonLd(`professional-${professional.uid}`, schemaData);

    // Cleanup on unmount or when professional changes
    return () => {
      document.title = previousTitle;
      if (existingMetaDesc) updateMetaTag('name', 'description', existingMetaDesc);
      if (existingOgTitle) updateMetaTag('property', 'og:title', existingOgTitle);
      if (existingOgDesc) updateMetaTag('property', 'og:description', existingOgDesc);
      if (existingOgImage) updateMetaTag('property', 'og:image', existingOgImage);
      if (existingCanonical) updateCanonicalLink(existingCanonical);
      removeJsonLd(`professional-${professional.uid}`);
    };
  }, [professional, reviews]);
}
