import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  analytics: {},
  googleProvider: {},
  appleProvider: {}
}));

import { getProfessionalBadges, BADGE_DEFINITIONS } from './badgeUtils';
import { User } from '../types';

describe('getProfessionalBadges', () => {
  const createBaseProfessional = (overrides?: Partial<User['profesionalInfo']>): User => ({
    uid: 'test-user-123',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    fotoUrl: 'http://example.com/photo.jpg',
    rol: 'profesional',
    ciudad: 'Bahía Blanca',
    zona: 'Centro',
    profesionalInfo: {
      rubro: 'Electricista',
      descripcion: 'Electricista con experiencia',
      isVip: false,
      ratingAvg: 4.0,
      reviewCount: 0,
      fotosTrabajos: [],
      ...overrides
    }
  });

  describe('Guard clauses', () => {
    it('returns an empty array when user is not a profesional', () => {
      const clientUser: User = {
        uid: 'client-1',
        nombre: 'Maria',
        email: 'maria@example.com',
        fotoUrl: '',
        rol: 'cliente',
        ciudad: 'Bahía Blanca',
        zona: 'Centro'
      };
      expect(getProfessionalBadges(clientUser)).toEqual([]);
    });

    it('returns an empty array when profesionalInfo is missing', () => {
      const userWithoutInfo: User = {
        uid: 'pro-no-info',
        nombre: 'Carlos',
        email: 'carlos@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Centro',
        profesionalInfo: undefined
      };
      expect(getProfessionalBadges(userWithoutInfo)).toEqual([]);
    });
  });

  describe('Standard Badge Logic', () => {
    it('grants Respuesta Rápida badge if badge keyword exists in rawBadges or disponibilidadInmediata is true', () => {
      const userWithKeyword = createBaseProfessional({ badges: ['respuesta rapida'] });
      const badges1 = getProfessionalBadges(userWithKeyword);
      expect(badges1.some(b => b.id === 'respuesta_rapida')).toBe(true);

      const userWithDisponibilidad = createBaseProfessional({ disponibilidadInmediata: true });
      const badges2 = getProfessionalBadges(userWithDisponibilidad);
      expect(badges2.some(b => b.id === 'respuesta_rapida')).toBe(true);
    });

    it('grants Muy Valorado badge when rating criteria or keywords are met', () => {
      const highRatingUser = createBaseProfessional({ ratingAvg: 4.8, reviewCount: 2 });
      expect(getProfessionalBadges(highRatingUser).some(b => b.id === 'muy_valorado')).toBe(true);

      const topRatingUser = createBaseProfessional({ ratingAvg: 4.9, reviewCount: 0 });
      expect(getProfessionalBadges(topRatingUser).some(b => b.id === 'muy_valorado')).toBe(true);

      const keywordUser = createBaseProfessional({ badges: ['excelente'] });
      expect(getProfessionalBadges(keywordUser).some(b => b.id === 'muy_valorado')).toBe(true);
    });

    it('grants Matriculado Verificado badge when matriculado and matriculaVerified are true', () => {
      const user = createBaseProfessional({ matriculado: true, matriculaVerified: true });
      expect(getProfessionalBadges(user).some(b => b.id === 'matriculado_verificado')).toBe(true);
    });

    it('grants Identidad Verificada badge when isVerified is true', () => {
      const user = createBaseProfessional({ isVerified: true });
      expect(getProfessionalBadges(user).some(b => b.id === 'identidad_verificada')).toBe(true);
    });

    it('grants Top Bahía badge when VIP or reviewCount >= 4 or profileViews >= 30 or top keyword exists', () => {
      const userViews = createBaseProfessional({ profileViews: 30 });
      expect(getProfessionalBadges(userViews).some(b => b.id === 'top_bahia')).toBe(true);

      const userReviews = createBaseProfessional({ reviewCount: 4 });
      expect(getProfessionalBadges(userReviews).some(b => b.id === 'top_bahia')).toBe(true);

      const userKeyword = createBaseProfessional({ badges: ['top'] });
      expect(getProfessionalBadges(userKeyword).some(b => b.id === 'top_bahia')).toBe(true);
    });

    it('grants Puntualidad badge when puntual keyword exists', () => {
      const user = createBaseProfessional({ badges: ['Puntualidad'] });
      expect(getProfessionalBadges(user).some(b => b.id === 'puntualidad')).toBe(true);
    });

    it('grants Garantía badge when garantía/garantia keyword exists', () => {
      const user = createBaseProfessional({ badges: ['Garantia escrita'] });
      expect(getProfessionalBadges(user).some(b => b.id === 'garantia_bahia')).toBe(true);
    });
  });

  describe('Custom Badges Logic (filtering standard keywords vs adding custom badges)', () => {
    it('creates custom badge objects for badges that do NOT match any standard keywords', () => {
      const customBadgeName = 'Presupuesto Sin Cargo';
      const user = createBaseProfessional({ badges: [customBadgeName] });

      const badges = getProfessionalBadges(user);
      const customBadge = badges.find(b => b.id === `custom_${customBadgeName}`);

      expect(customBadge).toBeDefined();
      expect(customBadge).toEqual({
        id: `custom_${customBadgeName}`,
        label: customBadgeName,
        shortLabel: customBadgeName,
        description: `Insignia distintiva: ${customBadgeName}`,
        category: 'confianza',
        icon: 'Award',
        colorClass: {
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-800 dark:text-slate-200',
          border: 'border-slate-200 dark:border-slate-700',
          icon: 'text-indigo-600 dark:text-indigo-400'
        },
        tooltip: `${customBadgeName}: Reconocimiento otorgado al profesional.`
      });
    });

    it('filters out custom badges that contain standard keywords in standardKeywords array', () => {
      const standardKeywordsBadges = [
        'Respuesta Rápida',
        'Respuesta rapida',
        'Muy Valorado',
        'Matriculado',
        'Usuario Verificado',
        'Top Bahía',
        'Puntualidad',
        'Garantía de satisfacción',
        'Garantia'
      ];

      const user = createBaseProfessional({ badges: standardKeywordsBadges });
      const badges = getProfessionalBadges(user);

      // Verify no custom badges were added for any of the above
      const customBadges = badges.filter(b => b.id.startsWith('custom_'));
      expect(customBadges).toHaveLength(0);
    });

    it('handles a mix of standard keyword badges and custom badges', () => {
      const user = createBaseProfessional({
        badges: ['Respuesta Rápida', '24 Horas Emergencias', 'Garantía Total', 'Excelente Atención']
      });

      const badges = getProfessionalBadges(user);

      // Standard badge triggers
      expect(badges.some(b => b.id === 'respuesta_rapida')).toBe(true);
      expect(badges.some(b => b.id === 'garantia_bahia')).toBe(true);

      // Custom badges (not containing standard keywords: rapida, rápida, valorado, matriculado, verificado, top, puntual, garantia, garantía)
      expect(badges.some(b => b.id === 'custom_24 Horas Emergencias')).toBe(true);
      expect(badges.some(b => b.id === 'custom_Excelente Atención')).toBe(true);

      // Custom badges containing standard keywords should NOT be duplicated as custom_
      expect(badges.some(b => b.id === 'custom_Respuesta Rápida')).toBe(false);
      expect(badges.some(b => b.id === 'custom_Garantía Total')).toBe(false);
    });

    it('handles empty or undefined badges array gracefully without throwing', () => {
      const userWithEmptyBadges = createBaseProfessional({ badges: [] });
      expect(() => getProfessionalBadges(userWithEmptyBadges)).not.toThrow();
      expect(getProfessionalBadges(userWithEmptyBadges)).toEqual([]);

      const userWithUndefinedBadges = createBaseProfessional({ badges: undefined });
      expect(() => getProfessionalBadges(userWithUndefinedBadges)).not.toThrow();
      expect(getProfessionalBadges(userWithUndefinedBadges)).toEqual([]);
    });

    it('trims whitespace and checks case-insensitively when evaluating standard keywords for custom badges', () => {
      const user = createBaseProfessional({
        badges: ['  TOP  ', '   GARANTÍA   ', '   Atención Personalizada   ']
      });

      const badges = getProfessionalBadges(user);

      // '  TOP  ' and '   GARANTÍA   ' contain standard keywords 'top' and 'garantía'
      expect(badges.some(b => b.id === 'custom_  TOP  ')).toBe(false);
      expect(badges.some(b => b.id === 'custom_   GARANTÍA   ')).toBe(false);

      // '   Atención Personalizada   ' does not contain standard keywords
      expect(badges.some(b => b.id === 'custom_   Atención Personalizada   ')).toBe(true);
    });
  });
});
