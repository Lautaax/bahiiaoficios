import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  functions: {},
}));

import { getProfessionalBadges, BADGE_DEFINITIONS } from './badgeUtils';
import { User } from '../types';

describe('badgeUtils - getProfessionalBadges', () => {
  const baseProfessional: User = {
    uid: 'prof-1',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    fotoUrl: '',
    rol: 'profesional',
    ciudad: 'Bahía Blanca',
    zona: 'Centro',
    profesionalInfo: {
      rubro: 'Electricista',
      descripcion: 'Electricista matriculado',
      isVip: false,
      ratingAvg: 0,
      reviewCount: 0,
      fotosTrabajos: [],
    },
  };

  it('returns empty array if user role is not profesional', () => {
    const clientUser: User = {
      ...baseProfessional,
      rol: 'cliente',
    };
    expect(getProfessionalBadges(clientUser)).toEqual([]);
  });

  it('returns empty array if user lacks profesionalInfo', () => {
    const userWithoutInfo: User = {
      ...baseProfessional,
      profesionalInfo: undefined,
    };
    expect(getProfessionalBadges(userWithoutInfo)).toEqual([]);
  });

  describe('Muy Valorado badge thresholds', () => {
    it('awards badge when ratingAvg >= 4.7 AND reviewCount >= 2', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          ratingAvg: 4.7,
          reviewCount: 2,
        },
      };

      const badges = getProfessionalBadges(professional);
      const muyValoradoBadge = badges.find((b) => b.id === 'muy_valorado');
      expect(muyValoradoBadge).toBeDefined();
      expect(muyValoradoBadge?.label).toBe(BADGE_DEFINITIONS.muy_valorado.label);
    });

    it('does NOT award badge when ratingAvg >= 4.7 but reviewCount < 2 and ratingAvg < 4.9', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          ratingAvg: 4.8,
          reviewCount: 1,
        },
      };

      const badges = getProfessionalBadges(professional);
      const muyValoradoBadge = badges.find((b) => b.id === 'muy_valorado');
      expect(muyValoradoBadge).toBeUndefined();
    });

    it('does NOT award badge when ratingAvg < 4.7 even with high reviewCount', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          ratingAvg: 4.69,
          reviewCount: 10,
        },
      };

      const badges = getProfessionalBadges(professional);
      const muyValoradoBadge = badges.find((b) => b.id === 'muy_valorado');
      expect(muyValoradoBadge).toBeUndefined();
    });

    it('awards badge when ratingAvg >= 4.9 even if reviewCount < 2', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          ratingAvg: 4.9,
          reviewCount: 0,
        },
      };

      const badges = getProfessionalBadges(professional);
      const muyValoradoBadge = badges.find((b) => b.id === 'muy_valorado');
      expect(muyValoradoBadge).toBeDefined();
    });

    it('does NOT award badge when ratingAvg is 4.89 with reviewCount < 2', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          ratingAvg: 4.89,
          reviewCount: 1,
        },
      };

      const badges = getProfessionalBadges(professional);
      const muyValoradoBadge = badges.find((b) => b.id === 'muy_valorado');
      expect(muyValoradoBadge).toBeUndefined();
    });

    it('awards badge when raw Badges contain keywords like "valorado", "calidad", or "excelente"', () => {
      const keywords = ['Muy Valorado', 'Trabajo de Calidad', 'Excelente Servicio'];

      keywords.forEach((keyword) => {
        const professional: User = {
          ...baseProfessional,
          profesionalInfo: {
            ...baseProfessional.profesionalInfo!,
            ratingAvg: 3.5,
            reviewCount: 0,
            badges: [keyword],
          },
        };

        const badges = getProfessionalBadges(professional);
        const muyValoradoBadge = badges.find((b) => b.id === 'muy_valorado');
        expect(muyValoradoBadge).toBeDefined();
      });
    });
  });

  describe('Respuesta Rápida badge', () => {
    it('awards badge when disponibilidadInmediata is true', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          disponibilidadInmediata: true,
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'respuesta_rapida')).toBe(true);
    });

    it('awards badge when raw Badges contain keywords like "rápida", "rapida", "velocidad", "respuesta"', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          badges: ['Respuesta Rápida'],
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'respuesta_rapida')).toBe(true);
    });
  });

  describe('Matriculado Verificado badge', () => {
    it('awards badge only when matriculado AND matriculaVerified are both true', () => {
      const validProfessional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          matriculado: true,
          matriculaVerified: true,
        },
      };
      expect(getProfessionalBadges(validProfessional).some((b) => b.id === 'matriculado_verificado')).toBe(true);

      const unverifiedProfessional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          matriculado: true,
          matriculaVerified: false,
        },
      };
      expect(getProfessionalBadges(unverifiedProfessional).some((b) => b.id === 'matriculado_verificado')).toBe(false);
    });
  });

  describe('Identidad Verificada badge', () => {
    it('awards badge when isVerified is true', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          isVerified: true,
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'identidad_verificada')).toBe(true);
    });
  });

  describe('Top Bahía badge', () => {
    it('awards badge when isVip is true', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          isVip: true,
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'top_bahia')).toBe(true);
    });

    it('awards badge when reviewCount >= 4', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          reviewCount: 4,
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'top_bahia')).toBe(true);
    });

    it('awards badge when profileViews >= 30', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          profileViews: 30,
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'top_bahia')).toBe(true);
    });

    it('awards badge when raw Badges contain "top"', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          badges: ['Top Profesional'],
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'top_bahia')).toBe(true);
    });
  });

  describe('Puntualidad & Garantía badges', () => {
    it('awards Puntualidad badge when raw Badges contain "puntual"', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          badges: ['Gran puntualidad'],
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'puntualidad')).toBe(true);
    });

    it('awards Garantía badge when raw Badges contain "garantía" or "garantia"', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          badges: ['Garantía de trabajo'],
        },
      };

      const badges = getProfessionalBadges(professional);
      expect(badges.some((b) => b.id === 'garantia_bahia')).toBe(true);
    });
  });

  describe('Custom badges', () => {
    it('handles non-standard custom badges', () => {
      const professional: User = {
        ...baseProfessional,
        profesionalInfo: {
          ...baseProfessional.profesionalInfo!,
          badges: ['20 Años de Experiencia'],
        },
      };

      const badges = getProfessionalBadges(professional);
      const customBadge = badges.find((b) => b.id === 'custom_20 Años de Experiencia');
      expect(customBadge).toBeDefined();
      expect(customBadge?.label).toBe('20 Años de Experiencia');
    });
  });
});
