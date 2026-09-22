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
  vipExpiredAt?: any;
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
  matriculaVerified?: boolean; // Admin verified the license
  fotoMatricula?: string; // URL to the license image
  nombreNegocio?: string; // Optional business name
  profileViews?: number;
  whatsappClicks?: number;
  badges?: string[]; // e.g., 'Puntualidad', '100 Trabajos', 'Verificado'
  diasDisponibilidad?: number[]; // 0=Sunday, 1=Monday... 6=Saturday
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
  telefono?: string; // Optional phone number
  nombreNegocio?: string; // Optional business name
  profesionalInfo?: ProfesionalInfo; // Only if rol === 'profesional'
  createdAt?: any;
  isNewUser?: boolean;
  isAdmin?: boolean;
  favoritos?: string[]; // Array of professional UIDs
  slug?: string;
  busquedasRecientes?: Array<{
    term: string;
    category?: string;
    zona?: string;
    timestamp?: string;
  }>;
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

export interface PaymentRecord {
  id?: string;
  userId: string;
  paymentId?: string;
  type: 'vip_subscription' | 'ad_payment' | 'deposit';
  months?: number;
  amount?: number;
  status: 'approved' | 'pending' | 'rejected' | 'refunded' | 'expired';
  createdAt: any;
  expirationDate?: any;
  statementDescriptor?: string;
  planTitle?: string;
  notes?: string;
}

export interface JobBudgetProposal {
  id: string;
  profesionalId: string;
  profesionalNombre: string;
  profesionalFoto?: string;
  profesionalRubro?: string;
  profesionalTelefono?: string;
  profesionalIsVip?: boolean;
  profesionalRating?: number;
  profesionalSlug?: string;
  montoEstimado: number | string;
  tiempoEstimado: string;
  mensaje: string;
  incluyeMateriales?: boolean;
  requiereVisitaPrevia?: boolean;
  fecha: any;
  estado?: 'pendiente' | 'enviado' | 'aceptado' | 'rechazado';
}

export interface JobOfferRecord {
  id?: string;
  trabajoId: string;
  trabajoTitulo: string;
  trabajoRubro: string;
  trabajoZona: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono?: string;
  profesionalId: string;
  profesionalNombre: string;
  profesionalFoto?: string;
  profesionalRubro?: string;
  profesionalTelefono?: string;
  profesionalIsVip?: boolean;
  profesionalRating?: number;
  montoEstimado: number | string;
  tiempoEstimado: string;
  mensaje: string;
  incluyeMateriales?: boolean;
  requiereVisitaPrevia?: boolean;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  fechaEnvio: any;
  fechaActualizacion?: any;
}

export interface JobPost {
  id?: string;
  titulo: string;
  descripcion: string;
  rubro: string;
  zona: string;
  urgencia: 'urgente' | 'esta_semana' | 'flexible';
  presupuestoAproximado?: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  clienteFoto?: string;
  fotos?: string[];
  fechaCreacion: any;
  estado: 'abierto' | 'en_progreso' | 'completado' | 'cancelado';
  presupuestos: JobBudgetProposal[];
}

export interface UserFeedback {
  id?: string;
  tipo: 'error' | 'mejora' | 'calificacion';
  mensaje: string;
  rating?: number; // 1-5
  categoria?: string;
  url: string;
  ruta: string;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  usuarioNombre?: string | null;
  usuarioRol?: string;
  userAgent?: string;
  pantalla?: string;
  estado: 'pendiente' | 'en_revision' | 'resuelto';
  fecha: any;
}

export type ChurnRiskLevel = 'critico' | 'alto' | 'medio' | 'preventivo';

export interface ChurnRiskAlert {
  profesionalId: string;
  nombre: string;
  email?: string;
  telefono?: string;
  fotoUrl?: string;
  rubro: string;
  zona: string;
  nivelRiesgo: ChurnRiskLevel;
  diasInactivo: number;
  diagnosticoIA: string;
  probabilidadAbandono: number; // 0 - 100
  accionRecomendada: string;
  mensajeSugeridoWhatsApp: string;
  motivos: string[];
  vistas: number;
  contactos: number;
  isVip?: boolean;
  trabajosPendientesEnRubro?: number;
  ultimaConexionStr?: string;
}

export interface ChurnAuditReport {
  id?: string;
  fecha: string; // YYYY-MM-DD
  timestamp: any;
  saludGeneral: {
    scoreRetencion: number; // 0 - 100
    totalProfesionales: number;
    activos: number;
    enRiesgoCritico: number;
    enRiesgoAlto: number;
    enRiesgoMedio: number;
    enRiesgoPreventivo: number;
  };
  resumenEjecutivo: string;
  alertasRiesgoAbandono: ChurnRiskAlert[];
  oportunidadesReenganche: {
    rubro: string;
    zona?: string;
    solicitudesSinCubrir: number;
    profesionalesInactivos: number;
    estrategia: string;
  }[];
  accionesPrioritariasAdmin: {
    id: string;
    titulo: string;
    prioridad: 'alta' | 'media' | 'baja';
    accion: string;
    impacto: string;
  }[];
  tendenciaSemanal?: string;
  modeloUtilizado: string;
}

export interface CategoryPromotionInsight {
  rubro: string;
  prioridad: 'ALTA' | 'MEDIA' | 'OPORTUNIDAD';
  tipoPromocion: 'promover_demanda_clientes' | 'captar_profesionales' | 'reactivar_categoria';
  justificacionBasadaEnLogs: string;
  metricas7Dias: {
    profesionalesActivos: number;
    busquedas: number;
    solicitudesTrabajo: number;
    vistasPerfiles: number;
    contactosWhatsapp: number;
    scoreDemanda: number; // 0 - 100
  };
  sugerenciaEstrategica: string;
  copiaRedesSociales: string;
  notificacionPushSugerida: {
    titulo: string;
    cuerpo: string;
  };
  accionInmediataRecomendada: string;
}

export interface AiPromotionInsightsReport {
  fechaGeneracion: string;
  periodoAnalizado: string;
  resumenSemanal: string;
  kpisGenerales: {
    categoriaMayorDemanda: string;
    categoriaMayorDeficit: string;
    categoriaUrgentePromocionar: string;
    totalCategoriasAnalizadas: number;
    oportunidadesDetectadas: number;
    indiceEquilibrioMercado: number; // 0 - 100
  };
  categoriasParaPromocionar: CategoryPromotionInsight[];
  recomendacionesGeneralesMarketing: {
    id: string;
    titulo: string;
    descripcion: string;
    canalRecomendado: string;
    impactoEstimado: string;
  }[];
  modeloUtilizado: string;
}

export interface ProfessionalBadge {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  category: 'confianza' | 'calidad' | 'velocidad' | 'verificacion';
  icon: string; // Identifier for Lucide icon
  colorClass: {
    bg: string;
    text: string;
    border: string;
    icon: string;
  };
  tooltip: string;
}

export interface RecentSearchRecord {
  id?: string;
  userId?: string | null;
  userEmail?: string | null;
  term: string;
  category?: string;
  zona?: string;
  resultsCount?: number;
  timestamp: any;
  fechaStr?: string;
}

export interface PendingQuoteReminderLog {
  id?: string;
  tipo: 'quote_request' | 'trabajo_solicitado';
  solicitudId: string;
  tituloSolicitud: string;
  rubro: string;
  zona: string;
  clienteNombre: string;
  profesionalId: string;
  profesionalNombre?: string;
  horasPendiente: number;
  fechaSolicitud: any;
  fechaRecordatorio: any;
  estado: 'enviado' | 'leido' | 'respondido';
}

