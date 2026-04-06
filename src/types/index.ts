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
  nombreNegocio?: string; // Optional business name
  profileViews?: number;
  whatsappClicks?: number;
  badges?: string[]; // e.g., 'Puntualidad', '100 Trabajos', 'Verificado'
  preciosReferencia?: { servicio: string; precio: string }[];
  fotosTrabajosDetalle?: { url: string; descripcion: string }[];
  fotoPortada?: string;
  onboardingCompleted?: boolean;
}

export interface User {
  uid: string;
  nombre: string;
  email: string;
  fotoUrl: string;
  rol: Role;
  ciudad: string;
  zona: string; // e.g., 'Centro', 'Patagonia', 'Villa Mitre'
  nombreNegocio?: string; // Optional business name
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

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  active: boolean;
  position: 'home_carousel' | 'sidebar' | 'footer';
  createdAt: any;
  updatedAt?: any;
  businessUid?: string; // UID of the business that paid for the ad
  paymentStatus?: 'pending' | 'paid' | 'expired';
  paymentId?: string;
  expirationDate?: any;
  plan?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  price?: number;
  offersTradeDiscount?: boolean;
  tradeDiscountDetails?: string;
}

export interface TradeDiscount {
  id: string;
  businessName: string;
  description: string;
  discount: string;
  category: string; // e.g., 'Electricidad', 'Mecánica'
  address: string;
  imageUrl?: string;
  link?: string;
  active: boolean;
  createdAt: any;
}
