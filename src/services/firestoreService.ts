import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Firestore 
} from 'firebase/firestore';
import { User } from '../types';

/**
 * SERVICIO DE FIRESTORE
 * 
 * Este archivo contiene la lógica de consulta solicitada.
 * Nota: En este entorno de demostración, estas funciones no se ejecutan contra un Firebase real,
 * pero representan la implementación correcta.
 */

export const searchProfessionals = async (queryText: string, category: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  let results = [...MOCK_PROFESSIONALS];

  if (category) {
    results = results.filter(p => 
      p.profesionalInfo?.rubro?.toLowerCase() === category.toLowerCase() ||
      // Handle slug matching roughly
      p.profesionalInfo?.rubro?.toLowerCase().includes(category.toLowerCase())
    );
  }

  if (queryText) {
    const q = queryText.toLowerCase();
    results = results.filter(p => 
      p.nombre.toLowerCase().includes(q) ||
      p.profesionalInfo?.rubro.toLowerCase().includes(q) ||
      p.profesionalInfo?.descripcion.toLowerCase().includes(q)
    );
  }

  // Sort by VIP then Rating
  return results.sort((a, b) => {
    if (a.profesionalInfo?.isVip && !b.profesionalInfo?.isVip) return -1;
    if (!a.profesionalInfo?.isVip && b.profesionalInfo?.isVip) return 1;
    return (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0);
  });
};

// --- MOCK DATA FOR DEMO PURPOSES ---

export const MOCK_PROFESSIONALS: User[] = [
  {
    uid: '1',
    rol: 'profesional',
    nombre: 'Carlos Gomez',
    email: 'carlos@example.com',
    ciudad: 'Bahía Blanca',
    zona: 'Centro',
    fotoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200',
    profesionalInfo: {
      rubro: 'Electricista',
      descripcion: 'Instalaciones eléctricas domiciliarias e industriales. Urgencias 24hs.',
      ratingAvg: 4.8,
      reviewCount: 124,
      isVip: true,
      fotosTrabajos: []
    }
  },
  {
    uid: '2',
    rol: 'profesional',
    nombre: 'Ana Martinez',
    email: 'ana@example.com',
    ciudad: 'Bahía Blanca',
    zona: 'Villa Mitre',
    fotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    profesionalInfo: {
      rubro: 'Gasista',
      descripcion: 'Gasista matriculada. Instalación de estufas, cocinas y termotanques. Planos aprobados.',
      ratingAvg: 4.9,
      reviewCount: 89,
      isVip: true,
      fotosTrabajos: []
    }
  },
  {
    uid: '3',
    rol: 'profesional',
    nombre: 'Roberto Diaz',
    email: 'roberto@example.com',
    ciudad: 'Bahía Blanca',
    zona: 'Patagonia',
    fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    profesionalInfo: {
      rubro: 'Plomero',
      descripcion: 'Destapes, pérdidas de agua, instalación de grifería. Trabajo garantizado.',
      ratingAvg: 4.5,
      reviewCount: 42,
      isVip: false,
      fotosTrabajos: []
    }
  },
  {
    uid: '4',
    rol: 'profesional',
    nombre: 'Lucía Ferrero',
    email: 'lucia@example.com',
    ciudad: 'Bahía Blanca',
    zona: 'Universitario',
    fotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    profesionalInfo: {
      rubro: 'Electricista',
      descripcion: 'Electricidad en general. Colocación de luminarias y ventiladores.',
      ratingAvg: 4.2,
      reviewCount: 15,
      isVip: false,
      fotosTrabajos: []
    }
  },
  {
    uid: '5',
    rol: 'profesional',
    nombre: 'Miguel Ángel',
    email: 'miguel@example.com',
    ciudad: 'Bahía Blanca',
    zona: 'Centro',
    fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    profesionalInfo: {
      rubro: 'Electricista',
      descripcion: 'Técnico electricista con 20 años de experiencia. Obras nuevas y refacciones.',
      ratingAvg: 4.9,
      reviewCount: 210,
      isVip: true,
      fotosTrabajos: []
    }
  }
];
