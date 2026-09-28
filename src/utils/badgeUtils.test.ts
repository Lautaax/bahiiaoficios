import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProfessionalBadges, BADGE_DEFINITIONS } from './badgeUtils';
import { User } from '../types';

describe('getProfessionalBadges', () => {
  describe('No info and invalid user cases', () => {
    it('returns empty array when user is null or undefined', () => {
      assert.deepEqual(getProfessionalBadges(null as unknown as User), []);
      assert.deepEqual(getProfessionalBadges(undefined as unknown as User), []);
    });

    it('returns empty array when user is an empty object', () => {
      assert.deepEqual(getProfessionalBadges({} as User), []);
    });

    it('returns empty array when user is not a professional (rol is cliente)', () => {
      const clientUser: User = {
        uid: '123',
        nombre: 'Juan Perez',
        email: 'juan@example.com',
        fotoUrl: '',
        rol: 'cliente',
        ciudad: 'Bahía Blanca',
        zona: 'Centro',
      };
      assert.deepEqual(getProfessionalBadges(clientUser), []);
    });

    it('returns empty array when professional has no profesionalInfo', () => {
      const profUserWithoutInfo: User = {
        uid: '456',
        nombre: 'Maria Gomez',
        email: 'maria@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Palihue',
        profesionalInfo: undefined,
      };
      assert.deepEqual(getProfessionalBadges(profUserWithoutInfo), []);
    });
  });

  describe('Badge calculations for valid professional info', () => {
    it('assigns respuesta_rapida badge when disponibilidadInmediata is true', () => {
      const user: User = {
        uid: 'prof-1',
        nombre: 'Pedro',
        email: 'pedro@example.com',
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
          disponibilidadInmediata: true,
        },
      };

      const badges = getProfessionalBadges(user);
      const badgeIds = badges.map(b => b.id);
      assert.ok(badgeIds.includes('respuesta_rapida'));
    });

    it('assigns muy_valorado badge when ratingAvg >= 4.7 and reviewCount >= 2', () => {
      const user: User = {
        uid: 'prof-2',
        nombre: 'Ana',
        email: 'ana@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Villa Mitre',
        profesionalInfo: {
          rubro: 'Plomero',
          descripcion: 'Plomero profesional',
          isVip: false,
          ratingAvg: 4.8,
          reviewCount: 5,
          fotosTrabajos: [],
        },
      };

      const badges = getProfessionalBadges(user);
      const badgeIds = badges.map(b => b.id);
      assert.ok(badgeIds.includes('muy_valorado'));
    });

    it('assigns matriculado_verificado badge when matriculado and matriculaVerified are true', () => {
      const user: User = {
        uid: 'prof-3',
        nombre: 'Carlos',
        email: 'carlos@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Patagonia',
        profesionalInfo: {
          rubro: 'Gasista',
          descripcion: 'Gasista matriculado',
          isVip: false,
          ratingAvg: 4.0,
          reviewCount: 1,
          fotosTrabajos: [],
          matriculado: true,
          matriculaVerified: true,
        },
      };

      const badges = getProfessionalBadges(user);
      const badgeIds = badges.map(b => b.id);
      assert.ok(badgeIds.includes('matriculado_verificado'));
    });

    it('assigns identidad_verificada badge when isVerified is true', () => {
      const user: User = {
        uid: 'prof-4',
        nombre: 'Laura',
        email: 'laura@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Universitario',
        profesionalInfo: {
          rubro: 'Pintor',
          descripcion: 'Pintor de casas',
          isVip: false,
          ratingAvg: 0,
          reviewCount: 0,
          fotosTrabajos: [],
          isVerified: true,
        },
      };

      const badges = getProfessionalBadges(user);
      const badgeIds = badges.map(b => b.id);
      assert.ok(badgeIds.includes('identidad_verificada'));
    });

    it('assigns top_bahia badge when profileViews >= 30 or reviewCount >= 4', () => {
      const user: User = {
        uid: 'prof-5',
        nombre: 'Roberto',
        email: 'roberto@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Centro',
        profesionalInfo: {
          rubro: 'Carpintero',
          descripcion: 'Muebles a medida',
          isVip: false,
          ratingAvg: 4.0,
          reviewCount: 1,
          profileViews: 35,
          fotosTrabajos: [],
        },
      };

      const badges = getProfessionalBadges(user);
      const badgeIds = badges.map(b => b.id);
      assert.ok(badgeIds.includes('top_bahia'));
    });

    it('handles puntualidad, garantia, and custom badges', () => {
      const user: User = {
        uid: 'prof-6',
        nombre: 'Sofia',
        email: 'sofia@example.com',
        fotoUrl: '',
        rol: 'profesional',
        ciudad: 'Bahía Blanca',
        zona: 'Bella Vista',
        profesionalInfo: {
          rubro: 'Cerrajero',
          descripcion: 'Cerrajería 24hs',
          isVip: false,
          ratingAvg: 4.0,
          reviewCount: 1,
          fotosTrabajos: [],
          badges: ['Puntualidad total', 'Garantía escrita', 'Socio CACE'],
        },
      };

      const badges = getProfessionalBadges(user);
      const badgeIds = badges.map(b => b.id);

      assert.ok(badgeIds.includes('puntualidad'));
      assert.ok(badgeIds.includes('garantia_bahia'));
      assert.ok(badgeIds.includes('custom_Socio CACE'));
    });
  });
});
