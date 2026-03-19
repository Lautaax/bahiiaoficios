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
  haceUrgencias?: boolean;
  disponibilidadInmediata?: boolean;
  isVerified?: boolean;
  matriculado?: boolean; // Added for matriculado status
  profileViews?: number;
  whatsappClicks?: number;
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
  isAdmin?: boolean;
  slug?: string;
  mpConnect?: {
    access_token: string;
    refresh_token: string;
    public_key: string;
    user_id: number;
    linkedAt?: any;
  };
}

export interface Review {
  id: string;
  profesionalId: string;
  clienteId: string;
  rating: number; // 1-5
  comentario: string;
  fecha: Date;
  clienteNombre: string;
  fotos?: string[];
  badges?: string[]; // e.g., 'Puntualidad', 'Precio justo', 'Limpieza'
}

export interface QuoteRequest {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  rubro: string;
  zona: string;
  descripcion: string;
  fecha: any;
  estado: 'pendiente' | 'contactado' | 'cerrado';
  profesionalesAsignados: string[]; // Array of professional UIDs
}
