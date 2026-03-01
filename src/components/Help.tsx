import React from 'react';
import { HelpCircle, ArrowLeft, Mail, MessageCircle, FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Help: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
            <HelpCircle className="text-amber-600 dark:text-amber-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centro de Ayuda</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileQuestion size={20} className="text-indigo-500" />
              Preguntas Frecuentes
            </h3>
            <div className="space-y-4">
              <details className="group">
                <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-700 dark:text-gray-200">
                  <span>¿Cómo contacto a un profesional?</span>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn text-sm">
                  Puedes contactar a un profesional haciendo clic en el botón "Contactar" en su tarjeta o perfil. Verás opciones para llamar o enviar un email.
                </p>
              </details>
              
              <details className="group">
                <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-700 dark:text-gray-200">
                  <span>¿Es gratis registrarse?</span>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn text-sm">
                  Sí, el registro es completamente gratuito tanto para clientes como para profesionales. Los profesionales pueden optar por planes VIP para mayor visibilidad.
                </p>
              </details>

              <details className="group">
                <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-700 dark:text-gray-200">
                  <span>¿Cómo dejo una reseña?</span>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn text-sm">
                  Debes estar registrado como cliente. Ve al perfil del profesional y busca la sección de reseñas para dejar tu calificación y comentario.
                </p>
              </details>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Mail size={20} className="text-indigo-600 dark:text-indigo-400" />
                Soporte por Email
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                ¿No encuentras lo que buscas? Escríbenos y te responderemos a la brevedad.
              </p>
              <a href="mailto:soporte@bahiaoficios.com" className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                soporte@bahiaoficios.com
              </a>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <MessageCircle size={20} className="text-green-600 dark:text-green-400" />
                WhatsApp
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Atención rápida para consultas urgentes.
              </p>
              <a href="https://wa.me/5492911234567" target="_blank" rel="noopener noreferrer" className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                Contactar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
