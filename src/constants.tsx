import { 
  Lightbulb, Flame, Droplets, BrickWall, Brush, Hammer, Sprout, Wrench, Key, Truck, Sparkles, House, Megaphone, SprayCan, Bike, Car, Monitor, Wind, Scissors, Cpu, Anvil, Calculator, FileSignature,
  PenTool, Ruler, Square, Sofa, Settings, Disc, Move, Snowflake, Tv, Bell, Video, Scale, Pen, Brain, Apple, Activity, Hand, Dumbbell, GraduationCap, Languages, Palette
} from 'lucide-react';

export const PROFESSIONS = [
  { name: 'Electricista', icon: Lightbulb, category: 'Hogar y Construcción' },
  { name: 'Gasista', icon: Flame, category: 'Hogar y Construcción' },
  { name: 'Plomero', icon: Droplets, category: 'Hogar y Construcción' },
  { name: 'Albañil', icon: BrickWall, category: 'Hogar y Construcción' },
  { name: 'Pintor', icon: Brush, category: 'Hogar y Construcción' },
  { name: 'Carpintero', icon: Hammer, category: 'Hogar y Construcción' },
  { name: 'Jardinero', icon: Sprout, category: 'Hogar y Construcción' },
  { name: 'Techista', icon: House, category: 'Hogar y Construcción' },
  { name: 'Herrería', icon: Anvil, category: 'Hogar y Construcción' },
  { name: 'Aire Acondicionado', icon: Wind, category: 'Hogar y Construcción' },
  { name: 'Arquitecto', icon: PenTool, category: 'Hogar y Construcción' },
  { name: 'Maestro Mayor de Obra', icon: Ruler, category: 'Hogar y Construcción' },
  { name: 'Vidriero', icon: Square, category: 'Hogar y Construcción' },
  { name: 'Tapicero', icon: Sofa, category: 'Hogar y Construcción' },
  { name: 'Cerrajero', icon: Key, category: 'Servicios Generales' },
  { name: 'Flete', icon: Truck, category: 'Servicios Generales' },
  { name: 'Limpieza', icon: Sparkles, category: 'Servicios Generales' },
  { name: 'Modista', icon: Scissors, category: 'Servicios Generales' },
  { name: 'Informática', icon: Monitor, category: 'Servicios Generales' },
  { name: 'Electrónico', icon: Cpu, category: 'Servicios Generales' },
  { name: 'Tornero', icon: Settings, category: 'Servicios Generales' },
  { name: 'Reparación de Electrodomésticos', icon: Tv, category: 'Servicios Generales' },
  { name: 'Instalador de Alarmas', icon: Bell, category: 'Servicios Generales' },
  { name: 'Cámaras de Seguridad', icon: Video, category: 'Servicios Generales' },
  { name: 'Contador', icon: Calculator, category: 'Servicios Profesionales' },
  { name: 'Mandatario/Gestor', icon: FileSignature, category: 'Servicios Profesionales' },
  { name: 'Abogado', icon: Scale, category: 'Servicios Profesionales' },
  { name: 'Escribano', icon: Pen, category: 'Servicios Profesionales' },
  { name: 'Psicólogo', icon: Brain, category: 'Servicios Profesionales' },
  { name: 'Nutricionista', icon: Apple, category: 'Servicios Profesionales' },
  { name: 'Kinesiólogo', icon: Activity, category: 'Servicios Profesionales' },
  { name: 'Traductor', icon: Languages, category: 'Servicios Profesionales' },
  { name: 'Profesor Particular', icon: GraduationCap, category: 'Servicios Profesionales' },
  { name: 'Mecánico', icon: Wrench, category: 'Automotor' },
  { name: 'Pintor Autos', icon: SprayCan, category: 'Automotor' },
  { name: 'Chapa y Pintura', icon: Car, category: 'Automotor' },
  { name: 'Mecánico Motos', icon: Bike, category: 'Automotor' },
  { name: 'Gomería', icon: Disc, category: 'Automotor' },
  { name: 'Alineación y Balanceo', icon: Move, category: 'Automotor' },
  { name: 'Lavadero de Autos', icon: Droplets, category: 'Automotor' },
  { name: 'Community Manager', icon: Megaphone, category: 'Digital y Diseño' },
  { name: 'Diseñador Gráfico', icon: Palette, category: 'Digital y Diseño' },
  { name: 'Peluquero/Barbero', icon: Scissors, category: 'Estética y Salud' },
  { name: 'Manicuría/Pedicuría', icon: Hand, category: 'Estética y Salud' },
  { name: 'Entrenador Personal', icon: Dumbbell, category: 'Estética y Salud' },
];

export const ZONAS = [
  'Centro', 
  'Macrocentro',
  'Universitario', 
  'Villa Mitre', 
  'Patagonia', 
  'Noroeste',
  'Los Almendros',
  'Norte', 
  'Bella Vista', 
  'Palihue', 
  'San Andrés', 
  'Tiro Federal', 
  'Ingeniero White',
  'Aldea Romana',
  'Villa Harding Green',
  'Villa Rosas',
  'Las Villas',
  'Pacífico',
  'La Falda',
  'Napostá',
  'Pedro Pico',
  'General Daniel Cerri',
  'Cabildo',
  'Villa Belgrano',
  'Villa Floresta',
  'Villa Amaducci',
  'Villa Duprat',
  'Villa Serra',
  'Villa Talleres',
  'Km 5',
  'Loma Paraguaya',
  'San Roque',
  'Estomba',
  'Mariano Moreno',
  'Kilómetro 5',
  'Punta Alta'
];

export const PROFESSION_TIPS: Record<string, string[]> = {
  'Electricista': [
    'Verifica que el profesional esté matriculado para trabajos que requieran certificación.',
    'Pide un presupuesto detallado que incluya materiales y mano de obra.',
    'Asegúrate de que utilice materiales normalizados (sellos IRAM).',
    'Consulta si ofrece garantía por el trabajo realizado.'
  ],
  'Plomero': [
    'Solicita referencias de trabajos anteriores similares.',
    'Verifica si el profesional cuenta con herramientas adecuadas para detectar fugas.',
    'Acuerda si el presupuesto incluye la rotura y reparación de paredes/pisos.',
    'Pregunta por la duración estimada del trabajo.'
  ],
  'Gasista': [
    'Es fundamental que sea un Gasista Matriculado por seguridad y normativas.',
    'Verifica su credencial vigente antes de comenzar cualquier obra.',
    'Pide que realice pruebas de hermeticidad al finalizar.',
    'No aceptes instalaciones que no cumplan con las normas de Camuzzi.'
  ],
  'Albañil': [
    'Define claramente el alcance del proyecto antes de empezar.',
    'Establece un plan de pagos por etapas cumplidas.',
    'Consulta quién se encarga de la compra y acarreo de materiales.',
    'Asegúrate de que mantenga la limpieza de la obra.'
  ],
  'Pintor': [
    'Pide asesoramiento sobre el tipo de pintura adecuado para cada superficie.',
    'Verifica que el presupuesto incluya la preparación previa de las paredes (lijado, enduido).',
    'Consulta cuántas manos de pintura están incluidas.',
    'Asegúrate de que proteja muebles y pisos antes de comenzar.'
  ],
  'Carpintero': [
    'Pide ver fotos de trabajos terminados o muestras de madera.',
    'Define el tipo de herrajes y terminaciones (lustre, laca, melamina).',
    'Toma medidas precisas y pide un diseño o croquis previo.',
    'Consulta sobre el tiempo de entrega e instalación.'
  ],
  'Default': [
    'Revisa las opiniones de otros clientes en su perfil.',
    'Pide siempre un presupuesto por escrito antes de iniciar.',
    'Comunícate a través del chat de la plataforma para mayor seguridad.',
    'No realices pagos por adelantado sin una garantía o contrato.'
  ]
};
