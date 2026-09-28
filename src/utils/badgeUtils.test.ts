import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProfessionalBadges, BADGE_DEFINITIONS } from './badgeUtils';
import { User } from '../types';

describe('badgeUtils - getProfessionalBadges', () => {
  const baseProfessionalUser: User = {
    uid: 'prof-123',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    fotoUrl: 'https://example.com/photo.jpg',
    rol: 'profesional',
    ciudad: 'Bahía Blanca',
    zona: 'Centro',
    profesionalInfo: {
      rubro: 'Electricidad',
      descripcion: 'Electricista matriculado',
      isVip: false,
      ratingAvg: 0,
      reviewCount: 0,
      fotosTrabajos: [],
      badges: [],
    },
  };

  it('should return empty array when user role is not profesional', () => {
    const clientUser: User = {
      ...baseProfessionalUser,
      rol: 'cliente',
    };
    const badges = getProfessionalBadges(clientUser);
    assert.deepEqual(badges, []);
  });

  it('should return empty array when profesionalInfo is undefined', () => {
    const userWithoutInfo: User = {
      ...baseProfessionalUser,
      profesionalInfo: undefined,
    };
    const badges = getProfessionalBadges(userWithoutInfo);
    assert.deepEqual(badges, []);
  });

  describe('Respuesta Rápida badge logic', () => {
    it('should award respuesta_rapida when disponibilidadInmediata is true', () => {
      const user: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          disponibilidadInmediata: true,
        },
      };

      const badges = getProfessionalBadges(user);
      const respuestaRapidaBadge = badges.find((b) => b.id === 'respuesta_rapida');
      assert.ok(respuestaRapidaBadge);
      assert.deepEqual(respuestaRapidaBadge, BADGE_DEFINITIONS.respuesta_rapida);
    });

    it('should award respuesta_rapida when rawBadges contains "rápida", "rapida", "velocidad", or "respuesta"', () => {
      const keywords = ['Respuesta Rápida', 'Atencion Rapida', 'Alta Velocidad', 'Respuesta Inmediata'];

      for (const keyword of keywords) {
        const user: User = {
          ...baseProfessionalUser,
          profesionalInfo: {
            ...baseProfessionalUser.profesionalInfo!,
            badges: [keyword],
          },
        };

        const badges = getProfessionalBadges(user);
        const respuestaRapidaBadge = badges.find((b) => b.id === 'respuesta_rapida');
        assert.ok(respuestaRapidaBadge, `Expected badge for keyword: "${keyword}"`);
      }
    });

    it('should NOT award respuesta_rapida when disponibilidadInmediata is false/undefined and badges do not contain keywords', () => {
      const user: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          disponibilidadInmediata: false,
          badges: ['Puntualidad'],
        },
      };

      const badges = getProfessionalBadges(user);
      const respuestaRapidaBadge = badges.find((b) => b.id === 'respuesta_rapida');
      assert.equal(respuestaRapidaBadge, undefined);
    });
  });

  describe('Other badge rules', () => {
    it('should award muy_valorado based on ratingAvg, reviewCount, or rawBadges keywords', () => {
      // High rating and reviews
      const highRatingUser: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          ratingAvg: 4.8,
          reviewCount: 3,
        },
      };
      assert.ok(getProfessionalBadges(highRatingUser).some((b) => b.id === 'muy_valorado'));

      // Rating >= 4.9 regardless of reviewCount
      const topRatingUser: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          ratingAvg: 4.9,
          reviewCount: 0,
        },
      };
      assert.ok(getProfessionalBadges(topRatingUser).some((b) => b.id === 'muy_valorado'));

      // Raw badges contain keyword "excelente"
      const keywordUser: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          badges: ['Servicio Excelente'],
        },
      };
      assert.ok(getProfessionalBadges(keywordUser).some((b) => b.id === 'muy_valorado'));
    });

    it('should award matriculado_verificado when matriculado and matriculaVerified are true', () => {
      const user: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          matriculado: true,
          matriculaVerified: true,
        },
      };

      assert.ok(getProfessionalBadges(user).some((b) => b.id === 'matriculado_verificado'));
    });

    it('should award identidad_verificada when isVerified is true', () => {
      const user: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          isVerified: true,
        },
      };

      assert.ok(getProfessionalBadges(user).some((b) => b.id === 'identidad_verificada'));
    });

    it('should award top_bahia when VIP or views/reviews threshold met or "top" badge keyword present', () => {
      const user: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          profileViews: 35,
        },
      };

      assert.ok(getProfessionalBadges(user).some((b) => b.id === 'top_bahia'));
    });

    it('should award puntualidad and garantia_bahia based on badge keywords', () => {
      const user: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          badges: ['Puntualidad', 'Garantía Total'],
        },
      };

      const badges = getProfessionalBadges(user);
      assert.ok(badges.some((b) => b.id === 'puntualidad'));
      assert.ok(badges.some((b) => b.id === 'garantia_bahia'));
    });

    it('should create custom badge for non-standard badge strings', () => {
      const customBadgeName = 'Atención 24hs';
      const user: User = {
        ...baseProfessionalUser,
        profesionalInfo: {
          ...baseProfessionalUser.profesionalInfo!,
          badges: [customBadgeName],
        },
      };

      const badges = getProfessionalBadges(user);
      const custom = badges.find((b) => b.id === `custom_${customBadgeName}`);
      assert.ok(custom);
      assert.equal(custom.label, customBadgeName);
    });
  });
});
