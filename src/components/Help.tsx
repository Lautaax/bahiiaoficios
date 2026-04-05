import React from 'react';
import { HelpCircle, ArrowLeft, Mail, MessageCircle, FileQuestion, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FAQ } from './FAQ';
import { HelpChatbot } from './HelpChatbot';

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
          
          <div className="bg-indigo-600 rounded-2xl p-8 text-white flex flex-col justify-center items-center text-center">
            <Bot size={48} className="mb-4" />
            <h3 className="text-xl font-bold mb-2">Asistente Virtual AI</h3>
            <p className="text-indigo-100 text-sm mb-6">
              ¿Tienes dudas sobre la plataforma o necesitas consejos técnicos? Nuestro asistente inteligente está listo para ayudarte.
            </p>
            <div className="flex items-center gap-2 text-xs bg-white/20 px-3 py-1.5 rounded-full font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Disponible ahora
            </div>
          </div>
        </div>
      </div>

      <FAQ />
    </div>
  );
};
