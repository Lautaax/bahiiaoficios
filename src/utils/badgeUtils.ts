import { User, ProfessionalBadge } from '../types';
import { isVipActive } from './vipUtils';

export const BADGE_DEFINITIONS: Record<string, Omit<ProfessionalBadge, 'acquired'>> = {
  respuesta_rapida: {
    id: 'respuesta_rapida',
    label: 'Respuesta Rápida',
    shortLabel: 'Rápido',
    description: 'Suele responder cotizaciones y consultas en menos de 2 horas.',
    category: 'velocidad',
    icon: 'Zap',
    colorClass: {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/60',
      icon: 'text-amber-500 fill-amber-400'
    },
    tooltip: '⚡ Respuesta Rápida: Responde consultas y presupuestos con alta celeridad.'
  },
  muy_valorado: {
    id: 'muy_valorado',
    label: 'Muy Valorado',
    shortLabel: 'Destacado',
    description: 'Excelente reputación con promedio superior a 4.7 estrellas de vecinos bahienses.',
    category: 'calidad',
    icon: 'Award',
    colorClass: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      icon: 'text-emerald-600 dark:text-emerald-400'
    },
    tooltip: '⭐ Muy Valorado: Gran satisfacción y comentarios positivos verificados.'
  },
  matriculado_verificado: {
    id: 'matriculado_verificado',
    label: 'Matriculado',
    shortLabel: 'Matriculado',
    description: 'Matrícula oficial y credenciales colegiadas verificadas en Bahía Blanca.',
    category: 'verificacion',
    icon: 'ScrollText',
    colorClass: {
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800/60',
      icon: 'text-blue-600 dark:text-blue-400'
    },
    tooltip: '📜 Matrícula Verificada: Habilitación profesional revisada por el equipo.'
  },
  identidad_verificada: {
    id: 'identidad_verificada',
    label: 'Identidad Verificada',
    shortLabel: 'Verificado',
    description: 'DNI y constancia de identidad validados.',
    category: 'confianza',
    icon: 'ShieldCheck',
    colorClass: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
      text: 'text-indigo-800 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800/60',
      icon: 'text-indigo-600 dark:text-indigo-400'
    },
    tooltip: '🛡️ Identidad Verificada: Documentación comprobada en la plataforma.'
  },
  top_bahia: {
    id: 'top_bahia',
    label: 'Top Bahía',
    shortLabel: 'Top Bahía',
    description: 'Entre los perfiles más consultados y activos del rubro en Bahía Blanca.',
    category: 'calidad',
    icon: 'Crown',
    colorClass: {
      bg: 'bg-purple-50 dark:bg-purple-950/50',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800/60',
      icon: 'text-purple-600 dark:text-purple-400'
    },
    tooltip: '🏆 Top Bahía: Profesional de alta demanda y recurrencia en la ciudad.'
  },
  puntualidad: {
    id: 'puntualidad',
    label: 'Puntualidad',
    shortLabel: 'Puntual',
    description: 'Reconocido por cumplir estrictamente los horarios y compromisos pactados.',
    category: 'confianza',
    icon: 'Clock',
    colorClass: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/50',
      text: 'text-cyan-800 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800/60',
      icon: 'text-cyan-600 dark:text-cyan-400'
    },
    tooltip: '⏱️ Puntualidad Destacada: Cumplimiento de tiempos y visitas acordadas.'
  },
  garantia_bahia: {
    id: 'garantia_bahia',
    label: 'Garantía en Trabajos',
    shortLabel: 'Garantía',
    description: 'Brinda garantía de satisfacción y soporte post-trabajo a sus clientes.',
    category: 'confianza',
    icon: 'CheckCircle2',
    colorClass: {
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      text: 'text-teal-800 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800/60',
      icon: 'text-teal-600 dark:text-teal-400'
    },
    tooltip: '✅ Garantía de Trabajo: Respaldo y seriedad en los resultados.'
  }
};

/**
 * Calculates and returns all active badges for a professional based on real data & profile badges.
 */
export function getProfessionalBadges(professional: User): ProfessionalBadge[] {
  if (professional.rol !== 'profesional' || !professional.profesionalInfo) {
    return [];
  }

  const info = professional.profesionalInfo;
  const rawBadges = (info.badges || []).map(b => b.toLowerCase().trim());
  const badges: ProfessionalBadge[] = [];

  // 1. Respuesta Rápida:
  // Awarded if badge explicitly present or has high responsiveness (disponibilidadInmediata, or marked)
  const hasRespuestaRapida = 
    rawBadges.some(b => b.includes('rápida') || b.includes('rapida') || b.includes('velocidad') || b.includes('respuesta')) ||
    info.disponibilidadInmediata === true;
  
  if (hasRespuestaRapida) {
    badges.push({
      ...BADGE_DEFINITIONS.respuesta_rapida
    });
  }

  // 2. Muy Valorado:
  // Awarded if ratingAvg >= 4.7 and at least 2 reviews, or rating >= 4.8, or badge present
  const isMuyValorado = 
    (info.ratingAvg >= 4.7 && (info.reviewCount || 0) >= 2) ||
    info.ratingAvg >= 4.9 ||
    rawBadges.some(b => b.includes('valorado') || b.includes('calidad') || b.includes('excelente'));

  if (isMuyValorado) {
    badges.push({
      ...BADGE_DEFINITIONS.muy_valorado
    });
  }

  // 3. Matriculado Verificado:
  if (info.matriculado && info.matriculaVerified) {
    badges.push({
      ...BADGE_DEFINITIONS.matriculado_verificado
    });
  }

  // 4. Identidad Verificada:
  if (info.isVerified) {
    badges.push({
      ...BADGE_DEFINITIONS.identidad_verificada
    });
  }

  // 5. Top Bahía:
  const isVip = isVipActive(info);
  const isTop = isVip || (info.reviewCount || 0) >= 4 || (info.profileViews || 0) >= 30 || rawBadges.some(b => b.includes('top'));
  if (isTop) {
    badges.push({
      ...BADGE_DEFINITIONS.top_bahia
    });
  }

  // 6. Puntualidad:
  if (rawBadges.some(b => b.includes('puntual'))) {
    badges.push({
      ...BADGE_DEFINITIONS.puntualidad
    });
  }

  // 7. Garantía:
  if (rawBadges.some(b => b.includes('garantía') || b.includes('garantia'))) {
    badges.push({
      ...BADGE_DEFINITIONS.garantia_bahia
    });
  }

  // 8. Custom badges in rawBadges that don't match the standard ones
  const standardKeywords = ['rapida', 'rápida', 'valorado', 'matriculado', 'verificado', 'top', 'puntual', 'garantia', 'garantía'];
  info.badges?.forEach((customBadge) => {
    const lower = customBadge.toLowerCase().trim();
    if (!standardKeywords.some(k => lower.includes(k))) {
      badges.push({
        id: `custom_${customBadge}`,
        label: customBadge,
        shortLabel: customBadge,
        description: `Insignia distintiva: ${customBadge}`,
        category: 'confianza',
        icon: 'Award',
        colorClass: {
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-800 dark:text-slate-200',
          border: 'border-slate-200 dark:border-slate-700',
          icon: 'text-indigo-600 dark:text-indigo-400'
        },
        tooltip: `${customBadge}: Reconocimiento otorgado al profesional.`
      });
    }
  });

  return badges;
}
