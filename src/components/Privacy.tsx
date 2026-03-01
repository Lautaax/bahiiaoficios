import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
            <Shield className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Política de Privacidad</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <p>Última actualización: 1 de Marzo de 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Información que Recopilamos</h2>
            <p>
              Recopilamos información que nos proporcionas directamente, como tu nombre, dirección de correo electrónico, número de teléfono y datos de perfil profesional cuando te registras en nuestra plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Uso de la Información</h2>
            <p>
              Utilizamos la información recopilada para:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Proporcionar, mantener y mejorar nuestros servicios.</li>
              <li>Facilitar la conexión entre clientes y profesionales.</li>
              <li>Enviar notificaciones técnicas, actualizaciones y alertas de seguridad.</li>
              <li>Responder a tus comentarios y preguntas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Compartir Información</h2>
            <p>
              No vendemos tu información personal a terceros. Compartimos tu información pública de perfil (nombre, rubro, zona, reseñas) con otros usuarios de la plataforma para facilitar los servicios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Seguridad de los Datos</h2>
            <p>
              Tomamos medidas razonables para proteger tu información personal contra pérdida, robo, uso indebido y acceso no autorizado. Sin embargo, ninguna transmisión por Internet es 100% segura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Tus Derechos</h2>
            <p>
              Tienes derecho a acceder, corregir o eliminar tu información personal. Puedes gestionar tu información desde la configuración de tu perfil o contactándonos directamente.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
