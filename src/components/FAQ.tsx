import React, { useState } from 'react';
import { 
  ChevronDown, 
  HelpCircle, 
  MapPin, 
  Flame, 
  Droplets, 
  Zap, 
  House, 
  ShieldCheck, 
  FileText, 
  MessageCircle, 
  Search 
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: 'general' | 'gas' | 'agua' | 'electricidad' | 'techos' | 'legal';
}

const FAQ_DATA: FaqItem[] = [
  // Local Bahía Blanca - Gas y Camuzzi
  {
    category: 'gas',
    question: '¿Cómo verificar si un gasista está matriculado en Camuzzi Gas del Sur en Bahía Blanca?',
    answer: 'En Bahía Oficios exigimos credencial oficial de matrícula a los gasistas. Podés verificar su número de matrícula directamente en su perfil (sello "Matriculado Verificado"). También podés consultar el padrón de matriculados habilitados en la sucursal de Camuzzi Bahía Blanca (Belgrano 480) o en su oficina virtual.'
  },
  {
    category: 'gas',
    question: '¿Qué hacer si Camuzzi me retiró el medidor por pérdida o denuncia en Bahía Blanca?',
    answer: 'Debés contratar obligatoriamente a un Gasista Matriculado (de 1ra o 2da categoría según el tipo de inmueble). El profesional realizará una prueba de hermeticidad con columna de agua, reparará las fugas, adecuará rejillas de ventilación y presentará el formulario de inspección técnica ante Camuzzi para la restitución del medidor.'
  },
  // Local Bahía Blanca - Agua y ABSA
  {
    category: 'agua',
    question: 'Tengo baja presión de agua o desborde cloacal: ¿le corresponde a ABSA o a un plomero particular?',
    answer: 'ABSA es responsable del servicio desde la red troncal de la calle hasta la llave de paso de la línea municipal (vereda). Toda la instalación interna desde la vereda hacia adentro (tanque de reserva, cisterna, bomba presurizadora, cañerías y cloacas domiciliarias) es responsabilidad del propietario y debe ser atendida por un plomero particular.'
  },
  {
    category: 'agua',
    question: '¿Por qué el agua de Bahía Blanca arruina termotanques y canillas rápidamente?',
    answer: 'El agua de red de Bahía Blanca tiene alto contenido de sales minerales (dureza del agua), lo que produce incrustaciones de sarro aceleradas en resistencias de termotanques, serpentinas de calefones y cartuchos de griferías monocomando. Los plomeros recomiendan cambiar el ánodo de magnesio del termotanque una vez al año y colocar filtros antisarro o ablandadores polifosfato en la entrada.'
  },
  // Local Bahía Blanca - Electricidad y EDES
  {
    category: 'electricidad',
    question: '¿Qué requisitos exige EDES para pedir un nuevo medidor de luz en Bahía Blanca?',
    answer: 'Para pedir la bajada de luz en EDES se requiere que un electricista matriculado o instalador idóneo ejecute el pilar reglamentario (caja para medidor normalizada, caño doble aislación, jabalina de puesta a tierra con protocolo de medición y tablero principal con disyuntor y térmica a menos de 2 metros del medidor).'
  },
  {
    category: 'electricidad',
    question: 'Se cortó la luz tras una tormenta con viento en Bahía Blanca: ¿cómo saber si es falla interna o de EDES?',
    answer: 'Primero mirá si las luminarias de la calle o las casas vecinas tienen suministro. Si tus vecinos tienen luz y bajó la palanca del disyuntor diferencial de tu casa, desconectá los artefactos que pudieran haber tenido contacto con humedad o goteras y consultá a un electricista de guardia para evitar un principio de incendio.'
  },
  // Local Bahía Blanca - Techos y Viento
  {
    category: 'techos',
    question: '¿Por qué se desprenden o filtran los techos de chapa con las ráfagas de viento bahiense?',
    answer: 'El viento del sudoeste en Bahía Blanca genera fuertes succiones dinámicas sobre las cubiertas. Para prevenir voladuras, los techistas recomiendan utilizar tirafondos reforzados con arandelas de neopreno vulcanizadas, clavaderas con anclaje químico a vigas y babetas de zinguería plegadas a medida con doble fijación.'
  },
  // Presupuestos y Legal
  {
    category: 'legal',
    question: '¿Cómo acordar plazos por escrito y qué hacer si el profesional no cumple?',
    answer: 'Recomendamos siempre utilizar la plantilla oficial de "Contrato / Recibo Rápido" descargable de Bahía Oficios (con dictado por voz). Allí se deja asentado el monto total, el detalle de tareas, la seña entregada y la fecha de finalización pactada. En caso de conflicto, Bahía Oficios cuenta con un canal de Mediación Comunitaria para revisar el acuerdo.'
  },
  {
    category: 'legal',
    question: '¿Cómo pedir factura legal (Monotributo / Responsable Inscripto) a un profesional?',
    answer: 'Los profesionales que emiten factura tienen la insignia "Hace Factura" en su perfil. Podés solicitarles Factura "C" (si son monotributistas) o Factura "A/B" (si son responsables inscriptos). En la factura debe detallarse la mano de obra prestada y tu número de CUIT o DNI para que sea válida ante consorcios o aseguradoras.'
  },
  {
    category: 'legal',
    question: '¿Cuánto se recomienda entregar de seña para iniciar un trabajo?',
    answer: 'La pauta comunitaria aconseja no entregar más del 30% al 40% del valor total antes de comenzar la obra. Si se requiere dinero para acopio de materiales pesados, lo más seguro es abonar directamente en el corralón o exigir remito oficial de entrega de materiales en tu domicilio.'
  },
  // Compartir y General
  {
    category: 'general',
    question: '¿Cómo compartir un profesional en mi grupo de WhatsApp vecinal (Palihue, Villa Mitre, Cerri, etc.)?',
    answer: 'Tanto en la tarjeta del profesional como en su perfil público contás con el botón "Recomendar en WhatsApp de Barrio". Al presionarlo, podés seleccionar tu barrio y se abrirá WhatsApp con un mensaje prearmado listo para enviar a tus vecinos con fotos de trabajos, calificación y enlace directo sin costo.'
  },
  {
    category: 'general',
    question: '¿Bahía Oficios cobra alguna comisión por contratar?',
    answer: 'No. Bahía Oficios es un directorio comunitario 100% libre de comisiones para clientes y vecinos. El valor acordado se abona íntegramente al profesional según los términos pactados entre ambas partes.'
  }
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredFaqs = FAQ_DATA.filter(faq => {
    const matchCat = filterCategory === 'todos' || faq.category === filterCategory;
    const matchSearch = !searchTerm.trim() || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 my-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-950/60 p-3 rounded-2xl text-amber-600 dark:text-amber-400">
            <HelpCircle size={26} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Preguntas Frecuentes sobre Oficios en Bahía Blanca
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Respuestas a las dudas más comunes sobre gasistas Camuzzi, agua ABSA, luz EDES y contrataciones
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar & Category Filter Pills */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Camuzzi, ABSA, EDES, plomero, seña, factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'todos', label: 'Todas las preguntas' },
            { id: 'gas', label: 'Gas y Camuzzi', icon: Flame },
            { id: 'agua', label: 'Plomería y ABSA', icon: Droplets },
            { id: 'electricidad', label: 'Electricidad y EDES', icon: Zap },
            { id: 'techos', label: 'Techos y Viento', icon: House },
            { id: 'legal', label: 'Facturas y Señas', icon: ShieldCheck }
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = filterCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {Icon && <Icon size={13} />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion FAQ Items */}
      <div className="space-y-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex justify-between items-center p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors text-left gap-4 cursor-pointer"
                >
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    size={18} 
                    className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} 
                  />
                </button>
                
                {isOpen && (
                  <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs sm:text-sm border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            No se encontraron preguntas con ese término. Probá con otra búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};
