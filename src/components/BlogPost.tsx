import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft } from 'lucide-react';

const BLOG_POSTS: Record<string, any> = {
  'como-elegir-buen-electricista': {
    title: 'Cómo elegir un buen electricista en Bahía Blanca',
    content: `
      <p>Elegir a un electricista capacitado es fundamental para la seguridad de tu hogar. Una mala instalación no solo puede dañar tus electrodomésticos, sino que también representa un riesgo grave de incendio.</p>
      
      <h3>1. Verifica sus credenciales</h3>
      <p>Asegúrate de que el profesional esté matriculado. En Bahía Blanca, los electricistas deben contar con una matrícula habilitante que garantiza que tienen los conocimientos técnicos necesarios.</p>
      
      <h3>2. Pide referencias y lee reseñas</h3>
      <p>La experiencia de otros clientes es invaluable. En Bahía Oficios puedes leer las reseñas de otros usuarios para conocer la puntualidad, prolijidad y calidad del trabajo del profesional.</p>
      
      <h3>3. Solicita un presupuesto detallado</h3>
      <p>Un buen electricista te dará un presupuesto claro que separe el costo de la mano de obra del costo de los materiales. Desconfía de los presupuestos demasiado bajos, ya que podrían implicar el uso de materiales de mala calidad.</p>
      
      <h3>4. Consulta sobre garantías</h3>
      <p>Pregunta siempre si el trabajo tiene garantía y por cuánto tiempo. Un profesional seguro de su trabajo no tendrá problema en ofrecerte una garantía por escrito.</p>
    `,
    date: '12 Mar 2026',
    author: 'Equipo Bahía Oficios',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1200'
  },
  'mantenimiento-preventivo-hogar': {
    title: 'Mantenimiento preventivo para el hogar: Guía básica',
    content: `
      <p>El mantenimiento preventivo es la mejor manera de evitar reparaciones costosas. Aquí te dejamos una lista de tareas que deberías realizar periódicamente.</p>
      
      <h3>Revisión de cañerías</h3>
      <p>Revisa debajo de las bachas y lavabos buscando signos de humedad. Una pequeña pérdida hoy puede convertirse en un problema estructural mañana.</p>
      
      <h3>Limpieza de canaletas</h3>
      <p>Especialmente antes de la época de lluvias, asegúrate de que las canaletas y desagües estén libres de hojas y escombros.</p>
      
      <h3>Mantenimiento del aire acondicionado</h3>
      <p>Limpia los filtros de tu aire acondicionado cada dos meses durante la temporada de uso. Esto no solo mejora la calidad del aire, sino que también reduce el consumo eléctrico.</p>
    `,
    date: '05 Mar 2026',
    author: 'Equipo Bahía Oficios',
    imageUrl: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&q=80&w=1200'
  },
  'cuando-llamar-plomero-urgencia': {
    title: '¿Cuándo llamar a un plomero de urgencia?',
    content: `
      <p>No todos los problemas de plomería requieren atención inmediata, pero algunos pueden causar daños graves si no se resuelven rápido.</p>
      
      <h3>1. Fugas de agua importantes</h3>
      <p>Si tienes una tubería rota que está inundando tu casa, corta la llave de paso principal y llama a un plomero de urgencia inmediatamente.</p>
      
      <h3>2. Falta total de agua</h3>
      <p>Si no tienes agua en toda la casa y no hay un corte general en tu barrio, es probable que haya un problema grave en tu instalación.</p>
      
      <h3>3. Desbordamiento del inodoro</h3>
      <p>Un inodoro que se desborda es una emergencia sanitaria. Cierra la llave de paso del inodoro y contacta a un profesional.</p>
    `,
    date: '28 Feb 2026',
    author: 'Equipo Bahía Oficios',
    imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=1200'
  }
};

export const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const post = id ? BLOG_POSTS[id] : null;

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Artículo no encontrado</h1>
        <Link to="/blog" className="text-indigo-600 hover:underline">Volver al blog</Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/blog" className="inline-flex items-center text-gray-500 hover:text-indigo-600 mb-8 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Volver al blog
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-2"><Calendar size={16} /> {post.date}</span>
          <span className="flex items-center gap-2"><User size={16} /> {post.author}</span>
        </div>
      </div>

      <div className="aspect-video rounded-2xl overflow-hidden mb-12 shadow-md">
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div 
        className="prose prose-lg dark:prose-invert max-w-none prose-indigo prose-headings:font-bold prose-h3:text-2xl prose-h3:mt-8 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-a:text-indigo-600"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
};
