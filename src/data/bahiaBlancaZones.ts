export interface BahiaZoneGeo {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  category: 'centro' | 'norte' | 'sur' | 'este' | 'oeste' | 'periferia' | 'interurbano';
}

export const BAHIA_BLANCA_CENTER = {
  lat: -38.7183,
  lng: -62.2663,
  zoom: 13
};

export const BAHIA_BLANCA_ZONES_GEO: BahiaZoneGeo[] = [
  { name: 'Centro', lat: -38.7183, lng: -62.2663, radiusMeters: 900, category: 'centro' },
  { name: 'Macrocentro', lat: -38.7230, lng: -62.2600, radiusMeters: 1000, category: 'centro' },
  { name: 'Universitario', lat: -38.7050, lng: -62.2680, radiusMeters: 1000, category: 'norte' },
  { name: 'Napostá', lat: -38.7090, lng: -62.2590, radiusMeters: 800, category: 'centro' },
  { name: 'Palihue', lat: -38.6920, lng: -62.2530, radiusMeters: 1100, category: 'norte' },
  { name: 'Patagonia', lat: -38.6750, lng: -62.2150, radiusMeters: 1400, category: 'este' },
  { name: 'Los Almendros', lat: -38.6850, lng: -62.2320, radiusMeters: 900, category: 'este' },
  { name: 'Aldea Romana', lat: -38.6700, lng: -62.2500, radiusMeters: 1200, category: 'norte' },
  { name: 'La Falda', lat: -38.7010, lng: -62.2450, radiusMeters: 900, category: 'norte' },
  { name: 'Bella Vista', lat: -38.7120, lng: -62.2450, radiusMeters: 1000, category: 'este' },
  { name: 'Villa Mitre', lat: -38.7250, lng: -62.2350, radiusMeters: 1300, category: 'este' },
  { name: 'Tiro Federal', lat: -38.7350, lng: -62.2420, radiusMeters: 1100, category: 'sur' },
  { name: 'Villa Rosas', lat: -38.7450, lng: -62.2490, radiusMeters: 1200, category: 'sur' },
  { name: 'Las Villas', lat: -38.7380, lng: -62.2310, radiusMeters: 1000, category: 'sur' },
  { name: 'Pacífico', lat: -38.7130, lng: -62.2850, radiusMeters: 1100, category: 'oeste' },
  { name: 'Noroeste', lat: -38.6990, lng: -62.2900, radiusMeters: 1200, category: 'oeste' },
  { name: 'Norte', lat: -38.6900, lng: -62.2750, radiusMeters: 1100, category: 'norte' },
  { name: 'Estomba', lat: -38.7190, lng: -62.2950, radiusMeters: 900, category: 'oeste' },
  { name: 'Mariano Moreno', lat: -38.7280, lng: -62.2720, radiusMeters: 900, category: 'oeste' },
  { name: 'Pedro Pico', lat: -38.7320, lng: -62.2650, radiusMeters: 900, category: 'sur' },
  { name: 'Km 5', lat: -38.7300, lng: -62.2800, radiusMeters: 1000, category: 'oeste' },
  { name: 'Kilómetro 5', lat: -38.7300, lng: -62.2800, radiusMeters: 1000, category: 'oeste' },
  { name: 'Loma Paraguaya', lat: -38.7550, lng: -62.2900, radiusMeters: 1200, category: 'sur' },
  { name: 'Villa Belgrano', lat: -38.7150, lng: -62.2200, radiusMeters: 900, category: 'este' },
  { name: 'Villa Floresta', lat: -38.7080, lng: -62.2300, radiusMeters: 900, category: 'este' },
  { name: 'Villa Amaducci', lat: -38.7170, lng: -62.2280, radiusMeters: 900, category: 'este' },
  { name: 'Villa Duprat', lat: -38.7240, lng: -62.2100, radiusMeters: 900, category: 'este' },
  { name: 'Villa Serra', lat: -38.7310, lng: -62.2050, radiusMeters: 900, category: 'este' },
  { name: 'Villa Talleres', lat: -38.7400, lng: -62.2180, radiusMeters: 900, category: 'este' },
  { name: 'Villa Harding Green', lat: -38.7200, lng: -62.1900, radiusMeters: 1600, category: 'periferia' },
  { name: 'San Andrés', lat: -38.6880, lng: -62.2050, radiusMeters: 1100, category: 'este' },
  { name: 'San Roque', lat: -38.7100, lng: -62.2250, radiusMeters: 900, category: 'este' },
  { name: 'Ingeniero White', lat: -38.7833, lng: -62.2667, radiusMeters: 1800, category: 'interurbano' },
  { name: 'General Daniel Cerri', lat: -38.7167, lng: -62.4000, radiusMeters: 2000, category: 'interurbano' },
  { name: 'Punta Alta', lat: -38.8780, lng: -62.0730, radiusMeters: 2500, category: 'interurbano' },
  { name: 'Cabildo', lat: -38.4500, lng: -61.9600, radiusMeters: 2500, category: 'interurbano' }
];

export function getZoneGeo(zoneName: string): BahiaZoneGeo {
  const normalized = zoneName.trim().toLowerCase();
  const found = BAHIA_BLANCA_ZONES_GEO.find(z => z.name.toLowerCase() === normalized);
  if (found) return found;

  // Fallback match or default to Centro
  const partial = BAHIA_BLANCA_ZONES_GEO.find(z => 
    normalized.includes(z.name.toLowerCase()) || z.name.toLowerCase().includes(normalized)
  );
  if (partial) return partial;

  return BAHIA_BLANCA_ZONES_GEO[0];
}
