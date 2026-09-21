import React from 'react';
import { Shield, ArrowLeft, Lock, Eye, Database, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link 
        to="/" 
        className="inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700"
      >
        <ArrowLeft size={16} className="mr-2" />
        Volver al inicio
      </Link>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-none border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
            <Shield size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Política de Privacidad y Protección de Datos
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Conforme a la Ley Nacional N° 25.326 de Protección de los Datos Personales (República Argentina)
            </p>
          </div>
        </div>

        <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
          <p>Última actualización: 20 de Marzo de 2026</p>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">1.</span> Información que Recopilamos
            </h2>
            <p>
              Bahía Oficios recopila los datos proporcionados voluntariamente por los usuarios al registrarse o interactuar en la plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong>Datos de Identificación y Contacto:</strong> Nombre, apellido, nombre de fantasía o comercial, dirección de correo electrónico, teléfono móvil / WhatsApp, fotografía de perfil y zona geográfica o barrio de Bahía Blanca.</li>
              <li><strong>Datos Profesionales Públicos:</strong> Rubros u oficios desempeñados, descripción de experiencia, condición de matriculación declarada, fotografías de obras o trabajos realizados y lista de precios de referencia.</li>
              <li><strong>Datos de Navegación y Uso:</strong> Direcciones IP, registros de fecha y hora de acceso y estadísticas anónimas de visualizaciones.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">2.</span> Consentimiento para la Publicación de Datos de Contacto
            </h2>
            <p>
              Al registrarse como "Profesional", el usuario presta su <strong>consentimiento expreso e informado</strong> para que su nombre, teléfono, zona barrial, rubro comercial y fotografías de trabajos sean exhibidos de forma pública y abierta en el directorio web de Bahía Oficios con la finalidad de que posibles clientes puedan comunicarse directamente.
            </p>
            <p>
              La plataforma no vende, no alquila ni comercializa bases de datos personales a agencias de publicidad o entidades de crédito.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">3.</span> Mensajería y Presupuestos
            </h2>
            <p>
              Las comunicaciones que se desarrollen dentro de las funciones de chat o solicitud de presupuestos son de acceso exclusivo entre los usuarios intervinientes y el sistema técnico de almacenamiento. Bahía Oficios no fiscaliza el contenido de los mensajes privados, salvo mediando requerimiento judicial emanado de autoridad competente del Departamento Judicial de Bahía Blanca.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">4.</span> Seguridad de la Información y Limitación Técnica
            </h2>
            <p>
              Aplicamos estándares razonables de seguridad tecnológica mediante protocolos cifrados (SSL/HTTPS) y autenticación delegada segura provista por Google Firebase. No obstante, el usuario reconoce y acepta que ninguna transmisión de datos a través de Internet es inexpugnable.
            </p>
            <p>
              En consecuencia, Bahía Oficios y sus creadores no serán responsables por accesos no autorizados, hackeos, ataques de denegación de servicio o filtraciones de datos ajenas a la debida diligencia de la administración.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">5.</span> Ejercicio de Derechos de Acceso, Rectificación y Supresión
            </h2>
            <p>
              De conformidad con el Artículo 14 de la Ley 25.326, el titular de los datos personales tiene la facultad de ejercer el derecho de acceso, actualización, rectificación y supresión de sus datos de forma gratuita.
            </p>
            <p>
              Para modificar o dar de baja su cuenta y perfil público, el usuario puede hacerlo en cualquier momento desde su panel de Configuración de Perfil o enviando una solicitud mediante los canales de ayuda de la plataforma.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Bahía Oficios • Bahía Blanca, Buenos Aires</span>
          <div className="flex gap-4">
            <Link to="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">Términos y Condiciones</Link>
            <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">Ir al Inicio</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
