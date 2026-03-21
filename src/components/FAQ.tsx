import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQ_DATA = [
  {
    question: '¿Cómo contacto a un profesional?',
    answer: 'Puedes contactar a un profesional haciendo clic en el botón "Contactar" en su tarjeta o perfil. Verás opciones para llamar o enviar un email.'
  },
  {
    question: '¿Es gratis registrarse?',
    answer: 'Sí, el registro es completamente gratuito tanto para clientes como para profesionales. Los profesionales pueden optar por planes VIP para mayor visibilidad.'
  },
  {
    question: '¿Cómo dejo una reseña?',
    answer: 'Debes estar registrado como cliente. Ve al perfil del profesional y busca la sección de reseñas para dejar tu calificación y comentario.'
  },
  {
    question: '¿Qué es el estado de "Perfil Verificado"?',
    answer: 'Los profesionales con "Perfil Verificado" han enviado su documentación (DNI/Matrícula) y ha sido aprobada por nuestro equipo de administración para mayor seguridad.'
  },
  {
    question: '¿Cómo funciona el sistema de señas?',
    answer: 'Si un profesional requiere una seña, puedes pagarla de forma segura a través de Mercado Pago directamente desde la plataforma.'
  }
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 my-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
          <HelpCircle className="text-amber-600 dark:text-amber-400" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preguntas Frecuentes (FAQ)</h2>
      </div>

      <div className="space-y-4">
        {FAQ_DATA.map((faq, index) => (
          <div 
            key={index} 
            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
              <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
              <ChevronDown 
                size={20} 
                className={`text-gray-500 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} 
              />
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm border-t border-gray-200 dark:border-gray-700">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
