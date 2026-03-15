import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { BlogQA } from './BlogQA';

const BLOG_POSTS = [
  {
    id: 'como-elegir-buen-electricista',
    title: 'Cómo elegir un buen electricista en Bahía Blanca',
    excerpt: 'Consejos clave para asegurarte de contratar a un profesional capacitado y evitar dolores de cabeza con la instalación eléctrica de tu hogar.',
    date: '12 Mar 2026',
    author: 'Equipo Bahía Oficios',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'mantenimiento-preventivo-hogar',
    title: 'Mantenimiento preventivo para el hogar: Guía básica',
    excerpt: 'Descubre las tareas esenciales que debes realizar cada temporada para mantener tu casa en perfectas condiciones y ahorrar dinero a largo plazo.',
    date: '05 Mar 2026',
    author: 'Equipo Bahía Oficios',
    imageUrl: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'cuando-llamar-plomero-urgencia',
    title: '¿Cuándo llamar a un plomero de urgencia?',
    excerpt: 'Aprende a identificar qué problemas de cañerías pueden esperar y cuáles requieren atención inmediata para evitar daños mayores.',
    date: '28 Feb 2026',
    author: 'Equipo Bahía Oficios',
    imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=800'
  }
];

export const Blog: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Blog y Consejos</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Artículos útiles, guías y consejos para el mantenimiento de tu hogar y cómo elegir a los mejores profesionales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {BLOG_POSTS.map((post) => (
          <article key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <Link to={`/blog/${post.id}`} className="block aspect-video overflow-hidden">
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </Link>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1"><Calendar size={14} /> {post.date}</span>
                <span className="flex items-center gap-1"><User size={14} /> {post.author}</span>
              </div>
              <Link to={`/blog/${post.id}`}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {post.title}
                </h2>
              </Link>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 flex-grow">
                {post.excerpt}
              </p>
              <Link 
                to={`/blog/${post.id}`}
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:gap-2 transition-all mt-auto"
              >
                Leer más <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <BlogQA />
    </div>
  );
};
