export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export type Role = 'cliente' | 'profesional';

export interface ProfesionalInfo {
  rubro: string; // Deprecated: primary profession for backward compatibility
  rubros?: string[]; // List of all professions
  descripcion: string;
  isVip: boolean;
  ratingAvg: number;
  reviewCount: number;
  fotosTrabajos: string[];
  vipExpiration?: any;
  telefono?: string;
  direccion?: string;
  fotoDni?: string;
  contactEmail?: string;
  cuit?: string;
  haceFactura?: boolean;
  tipoFactura?: 'A' | 'C';
}

export interface User {
  uid: string;
  nombre: string;
  email: string;
  fotoUrl: string;
  rol: Role;
  ciudad: string;
  zona: string; // e.g., 'Centro', 'Patagonia', 'Villa Mitre'
  profesionalInfo?: ProfesionalInfo; // Only if rol === 'profesional'
  createdAt?: any;
  isNewUser?: boolean;
}

export interface Review {
  id: string;
  profesionalId: string;
  clienteId: string;
  rating: number; // 1-5
  comentario: string;
  fecha: Date;
  clienteNombre: string;
}
