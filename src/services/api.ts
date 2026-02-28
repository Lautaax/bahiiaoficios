import { Category } from '../types';

export const api = {
  getCategories: async (): Promise<Category[]> => {
    // Mock data
    return [
      { id: '1', name: 'Electricista', slug: 'electricista' },
      { id: '2', name: 'Gasista', slug: 'gasista' },
      { id: '3', name: 'Plomero', slug: 'plomero' },
      { id: '4', name: 'Albañil', slug: 'albanil' },
      { id: '5', name: 'Pintor', slug: 'pintor' },
      { id: '6', name: 'Carpintero', slug: 'carpintero' },
      { id: '7', name: 'Jardinero', slug: 'jardinero' },
      { id: '8', name: 'Mecánico', slug: 'mecanico' },
      { id: '9', name: 'Cerrajero', slug: 'cerrajero' },
      { id: '10', name: 'Flete', slug: 'flete' },
      { id: '11', name: 'Limpieza', slug: 'limpieza' },
      { id: '12', name: 'Techista', slug: 'techista' }
    ];
  }
};
