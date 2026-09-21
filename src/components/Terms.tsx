import React from 'react';
import { FileText, ArrowLeft, ShieldAlert, Scale, CheckCircle2, AlertTriangle, Building2, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
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
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/60 p-3 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
            <Scale size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Términos, Condiciones y Deslinde Legal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Última actualización: 20 de Marzo de 2026 • Versión 2.1 (Válido para la República Argentina)
            </p>
          </div>
        </div>

        {/* Resumen Destacado de Deslinde */}
        <div className="my-6 p-4 sm:p-5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 text-xs sm:text-sm leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100 text-sm">
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
            <span>AVISO LEGAL FUNDAMENTAL Y DESLINDE DE RESPONSABILIDAD</span>
          </div>
          <p>
            <strong>Bahía Oficios</strong>, su creador/desarrollador individual, titulares y administradores actúan <strong>única y exclusivamente como un directorio digital pasivo y canal de contacto público</strong>. La plataforma <strong>NO es empleadora, contratista, mandataria ni intermediaria comercial o financiera</strong>.
          </p>
          <p>
            Al registrarse o utilizar el servicio, usted exime y libera a la plataforma y a sus creadores de <strong>toda responsabilidad civil, penal, comercial, laboral, contravencional o derivada de la Ley de Defensa del Consumidor</strong> ante cualquier desperfecto de obra, siniestro, accidente corporal, fuga, electrocución, incumplimiento, demora, estafa o perjuicio patrimonial derivado del vínculo entre usuarios.
          </p>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">1.</span> Naturaleza del Servicio: Mero Directorio de Contacto
            </h2>
            <p>
              Bahía Oficios es una herramienta técnica desarrollada para permitir que personas domiciliadas en Bahía Blanca y localidades aledañas localicen datos públicos de contacto de trabajadores autónomos, profesionales u oficios independientes.
            </p>
            <p>
              La plataforma <strong>no interviene en la negociación de presupuestos, no fija tarifas, no determina métodos de trabajo, no fiscaliza la ejecución de obras ni forma parte de ningún contrato verbal o escrito celebrado entre particulares</strong>. Cada relación contractual se rige exclusivamente por el Código Civil y Comercial de la Nación (Arts. 1251 y concs.) entre el comitente (cliente) y el prestador (profesional).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">2.</span> Inexistencia Absoluta de Relación Laboral, Societaria o de Mandato
            </h2>
            <p>
              Queda expresamente manifestado que no existe ningún tipo de vínculo laboral, subordinación jurídica, relación de dependencia, sociedad comercial, franquicia, agencia ni mandato entre Bahía Oficios (ni sus desarrolladores o administradores) y los profesionales registrados.
            </p>
            <p>
              Cada profesional inscripto declara operar como trabajador autónomo o empresa independiente por su propia y exclusiva cuenta y riesgo, asumiendo la total responsabilidad por sus obligaciones impositivas, tributarias (AFIP, ARBA, Municipalidad de Bahía Blanca), previsionales y de contratación de seguros de cobertura personal (Seguro de Accidentes Personales / ART).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">3.</span> Exención Total de Responsabilidad por Siniestros, Daños y Accidentes
            </h2>
            <p>
              Bajo ningún concepto Bahía Oficios, su creador particular o sus colaboradores responderán por:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>
                <strong>Daños a la propiedad o a terceros:</strong> Roturas, filtraciones, rajaduras de paredes, desmoronamientos, cortes accidentales de suministros, manchas o deterioros estructurales ocasionados durante o con posterioridad a la ejecución del trabajo.
              </li>
              <li>
                <strong>Siniestros graves y vicios de obra:</strong> Incendios, explosiones, intoxicaciones o muertes por monóxido de carbono, escapes de gas, electrocuciones, inundaciones por rotura de cañerías o fallas de cálculo técnico.
              </li>
              <li>
                <strong>Accidentes de trabajo y lesiones físicas:</strong> Lesiones, caídas en altura, descargas eléctricas, incapacidades o fallecimientos sufridos por el profesional, sus ayudantes, el cliente o habitantes del domicilio durante la prestación del servicio.
              </li>
              <li>
                <strong>Pérdidas económicas o lucro cesante:</strong> Demoras en plazos de entrega, sobrecostos de materiales, paralización de comercios o industrias y gastos derivados de la contratación de nuevos técnicos para reparar labores defectuosas.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">4.</span> Deslinde por Transacciones Económicas, Señas, Presupuestos y Estafas
            </h2>
            <p>
              Bahía Oficios <strong>NO procesa cobros ni pagos, NO es pasarela de transferencias bancarias, NO cobra comisión sobre los trabajos pactados ni intermedia en la compra de materiales</strong>.
            </p>
            <p>
              Cualquier suma de dinero entregada como seña, anticipo, acopio o pago total —ya sea en efectivo, transferencia bancaria, cheque o billetera virtual— es una transacción estrictamente privada y de exclusivo riesgo de las partes contratantes. Bahía Oficios y sus administradores quedan formalmente eximidos de cualquier reclamo por estafas, pagos indebidos, abandono de obra o negativas de restitución de fondos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">5.</span> Deber Exclusivo del Cliente de Verificar Matrículas y Habilitaciones
            </h2>
            <p>
              Las menciones de "Matriculado", "Habilitado" o "Certificado" exhibidas en los perfiles o tablones de pedidos se basan exclusivamente en las manifestaciones unilaterales vertidas bajo declaración jurada por cada usuario.
            </p>
            <p>
              <strong>Es deber personal e indelegable del usuario cliente solicitar, inspeccionar y cotejar de manera directa la credencial física vigente, número de matrícula y vigencia legal</strong> ante las autoridades y prestatarias pertinentes (por ejemplo: Camuzzi Gas del Sur S.A., ENARGAS, EDES S.A., Colegio de Técnicos de la Pcia. de Bs. As. Distrito VI, Colegio de Ingenieros o Municipalidad de Bahía Blanca) antes de permitir el ingreso del profesional a su domicilio o el inicio de tareas técnicas. Bahía Oficios no emite avales oficiales ni actúa como certificador de idoneidad técnica.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">6.</span> Declaración Jurada y Responsabilidad de los Profesionales
            </h2>
            <p>
              Todo usuario que se registre bajo la categoría de "Profesional" declara bajo juramento que:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Cuenta con los conocimientos, capacitaciones y, en su caso, matrículas habilitantes exigidas por ley para ejercer el oficio ofertado.</li>
              <li>Toda la información personal, comercial, de experiencia, fotografías y precios informados en la plataforma es veraz, fidedigna y no lesiona derechos de terceros.</li>
              <li>Asume de manera exclusiva toda la responsabilidad civil, penal, contractual y extracontractual frente a los clientes que lo contraten, manteniendo en todo momento indemne a Bahía Oficios y a sus creadores.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">7.</span> Cláusula de Indemnidad (Hold Harmless)
            </h2>
            <p>
              Tanto clientes como profesionales se comprometen a defender, indemnizar y mantener indemne a Bahía Oficios, su fundador/desarrollador individual, colaboradores y representantes, contra cualquier demanda, reclamo judicial, extrajudicial, mediación civil, sumario de la Oficina Municipal de Información al Consumidor (OMIC / Defensa del Consumidor), sanción administrativa, honorarios de abogados y costos procesales que pudieran surgir como consecuencia directa o indirecta del uso de la plataforma, de las contrataciones acordadas o del incumplimiento de los presentes términos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">8.</span> Reseñas, Calificaciones y Contenido de Usuarios
            </h2>
            <p>
              Las opiniones, puntuaciones y reseñas publicadas en Bahía Oficios pertenecen a sus respectivos autores. La plataforma no supervisa ni garantiza la exactitud de las opiniones vertidas, deslindándose de toda responsabilidad por eventuales ofensas, calumnias o disconformidades comerciales. La administración se reserva el derecho de eliminar perfiles o comentarios que infrinjan las normas de respeto y convivencia.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">9.</span> Ley Aplicable y Jurisdicción
            </h2>
            <p>
              Estos Términos y Condiciones se rigen por las leyes de la República Argentina. Ante cualquier divergencia, reclamo o controversia judicial relativa a la validez, interpretación o cumplimiento de estos términos, las partes acuerdan someterse a la jurisdicción exclusiva de los <strong>Tribunales Ordinarios en lo Civil y Comercial del Departamento Judicial de Bahía Blanca, Provincia de Buenos Aires</strong>, renunciando de forma irrevocable a cualquier otro fuero o jurisdicción que pudiera corresponder por razón de sus domicilios presentes o futuros.
            </p>
          </section>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Bahía Oficios • Directorio Comunitario de Bahía Blanca</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">Política de Privacidad</Link>
            <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline">Crear Cuenta</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
