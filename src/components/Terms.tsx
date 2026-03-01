import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
            <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Términos y Condiciones</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <p>Última actualización: 1 de Marzo de 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar Bahia Oficios, aceptas estar sujeto a estos términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos, no podrás acceder al servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Descripción del Servicio</h2>
            <p>
              Bahia Oficios es una plataforma que conecta a profesionales de diversos oficios con clientes potenciales en Bahía Blanca y la zona. No somos empleadores ni garantizamos la contratación de servicios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Registro y Cuentas</h2>
            <p>
              Para utilizar ciertas funciones del servicio, debes registrarte y crear una cuenta. Eres responsable de mantener la confidencialidad de tu cuenta y contraseña.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Debes proporcionar información precisa y completa.</li>
              <li>No puedes usar el servicio para actividades ilegales o no autorizadas.</li>
              <li>Nos reservamos el derecho de suspender o eliminar cuentas que violen estos términos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Responsabilidad</h2>
            <p>
              Bahia Oficios no se hace responsable de la calidad, seguridad o legalidad de los servicios ofrecidos por los profesionales, ni de la veracidad o exactitud de los anuncios. La relación contractual es exclusivamente entre el cliente y el profesional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos sobre cualquier cambio importante a través de la plataforma o por correo electrónico.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
