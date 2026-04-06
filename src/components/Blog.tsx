import React from 'react';
import { motion } from 'motion/react';
import { Calendar, User, ArrowRight, BookOpen, Clock, Tag, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  imageUrl: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'Cómo elegir el mejor electricista para tu hogar',
    excerpt: 'Descubrí los puntos clave que tenés que revisar antes de contratar a un profesional de la electricidad para evitar problemas a futuro.',
    content: `
      Contratar a un electricista no es algo que deba tomarse a la ligera. Una mala instalación puede derivar en cortocircuitos, daños en electrodomésticos o incluso incendios. Aquí te dejamos los puntos clave:

      1. **Verificá la Matrícula:** En Bahía Blanca, los electricistas matriculados garantizan que conocen las normativas vigentes de la AEA (Asociación Electrotécnica Argentina).
      2. **Pedí Referencias:** Consultá con vecinos o revisá las opiniones en Bahía Oficios. Un buen profesional siempre tiene clientes conformes.
      3. **Presupuesto Detallado:** Un electricista serio te explicará qué materiales se necesitan y por qué. Desconfiá de presupuestos excesivamente bajos.
      4. **Herramientas Adecuadas:** Observá si utiliza herramientas aisladas y equipos de medición como multímetros o pinzas amperométricas.

      Recordá que en Bahía Oficios podés ver el sello de "Matriculado" en los perfiles verificados.
    `,
    author: 'Equipo Bahía Oficios',
    date: '15 Mar, 2026',
    readTime: '5 min',
    category: 'Consejos',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    title: 'Mantenimiento preventivo de aire acondicionado',
    excerpt: 'No esperes al verano para revisar tu equipo. Te contamos cómo mantenerlo limpio y eficiente durante todo el año.',
    content: `
      El mantenimiento preventivo es la clave para que tu aire acondicionado dure muchos años y no consuma energía de más.

      **Limpieza de Filtros:** Es la tarea más sencilla y la que más impacto tiene. Debes hacerlo al menos una vez al mes durante la temporada de uso. Solo necesitás agua tibia y un jabón suave.
      
      **Revisión de la Unidad Exterior:** Asegurate de que no haya hojas, nidos de pájaros o suciedad obstruyendo el flujo de aire en el condensador.

      **Control de Gas:** Si notás que el equipo no enfría como antes, puede haber una pequeña fuga. Un técnico especializado debe revisar las presiones y no simplemente "agregar gas".

      Realizar un service anual con un profesional de Bahía Oficios te asegura un ambiente fresco y una factura de luz más baja.
    `,
    author: 'Juan Pérez - Técnico',
    date: '10 Mar, 2026',
    readTime: '4 min',
    category: 'Mantenimiento',
    imageUrl: 'https://images.unsplash.com/photo-1599939571322-792a326991f2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '3',
    title: '5 señales de que necesitás cambiar tus cañerías',
    excerpt: 'Las filtraciones pueden ser un dolor de cabeza. Aprendé a identificar cuándo es momento de llamar a un plomero de confianza.',
    content: `
      Muchas veces ignoramos pequeñas señales que terminan en grandes inundaciones. Prestá atención a estos 5 puntos:

      1. **Baja Presión de Agua:** Si de repente sale menos agua, puede haber una obstrucción por sarro o una fuga interna.
      2. **Manchas de Humedad:** Si aparecen manchas en paredes o techos, hay una pérdida activa que debe repararse urgente.
      3. **Agua con Color:** Si el agua sale amarronada o con sedimentos, tus cañerías de hierro están oxidadas por dentro.
      4. **Ruidos Extraños:** Los "golpes de ariete" o silbidos en las paredes indican problemas de presión o fijación de los caños.
      5. **Aumento en la Factura:** Si tu factura de ABSA sube sin motivo, podrías tener una fuga invisible.

      No esperes a que sea tarde. Consultá con un plomero en nuestra plataforma para un diagnóstico preventivo.
    `,
    author: 'Equipo Bahía Oficios',
    date: '05 Mar, 2026',
    readTime: '6 min',
    category: 'Plomería',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '4',
    title: 'Guía de pintura: ¿Cómo elegir el color ideal?',
    excerpt: 'La iluminación y el tamaño de los ambientes influyen en cómo se ve la pintura. Te damos los mejores tips para no fallar.',
    content: `
      Elegir el color de una habitación es una decisión emocionante pero difícil. Aquí te ayudamos a decidir:

      **Ambientes Pequeños:** Usá colores claros y neutros (blanco, tiza, gris perla) para dar sensación de amplitud.
      
      **Iluminación:** Un color que se ve bien en la pinturería puede verse muy distinto en tu living. Comprá una muestra pequeña y pintá un cuadrado de 30x30 cm en la pared para ver cómo cambia con la luz del día y la luz artificial.

      **El Techo:** Pintar el techo de un color más claro que las paredes hace que el ambiente parezca más alto.

      Si no te animás a hacerlo vos mismo, en Bahía Oficios tenemos pintores con años de experiencia que dejarán tu casa como nueva.
    `,
    author: 'Ana García - Decoradora',
    date: '01 Mar, 2026',
    readTime: '7 min',
    category: 'Decoración',
    imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  }
];

export const Blog: React.FC = () => {
  const [selectedPost, setSelectedPost] = React.useState<BlogPost | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4"
          >
            <BookOpen size={16} />
            BLOG DE CONSEJOS
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6"
          >
            Mantenimiento y Tips para tu Hogar
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Aprendé a cuidar tu casa con los mejores consejos de profesionales bahienses.
          </motion.p>
        </div>

        {/* Featured Post */}
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl shadow-xl overflow-hidden lg:grid lg:grid-cols-2 lg:gap-0 cursor-pointer group"
            onClick={() => setSelectedPost(BLOG_POSTS[0])}
          >
            <div className="relative h-64 lg:h-full overflow-hidden">
              <img
                src={BLOG_POSTS[0].imageUrl}
                alt={BLOG_POSTS[0].title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-6 left-6">
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                  Destacado
                </span>
              </div>
            </div>
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} /> {BLOG_POSTS[0].date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {BLOG_POSTS[0].readTime}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                {BLOG_POSTS[0].title}
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                {BLOG_POSTS[0].excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <User size={20} />
                  </div>
                  <span className="font-bold text-gray-900">{BLOG_POSTS[0].author}</span>
                </div>
                <button className="flex items-center gap-2 text-indigo-600 font-bold hover:underline">
                  Leer más <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.slice(1).map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-sm text-indigo-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {post.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 text-[10px] text-gray-500 mb-3 uppercase tracking-widest font-bold">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {post.readTime}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 text-sm mb-6 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-xs font-bold text-gray-900">{post.author}</span>
                  <button className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1">
                    Leer <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Post Modal */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
            >
              <button 
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md p-2 rounded-full text-gray-900 hover:bg-white transition-all shadow-md"
              >
                <X size={24} />
              </button>
              
              <div className="h-64 md:h-80 w-full relative">
                <img 
                  src={selectedPost.imageUrl} 
                  alt={selectedPost.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
                    {selectedPost.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    {selectedPost.title}
                  </h2>
                </div>
              </div>
              
              <div className="p-6 md:p-10">
                <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <User size={16} />
                    </div>
                    <span className="text-sm font-bold text-gray-900">{selectedPost.author}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} /> {selectedPost.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} /> {selectedPost.readTime}
                    </span>
                  </div>
                </div>
                
                <div className="prose prose-indigo max-w-none">
                  {selectedPost.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Cerrar Artículo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-20 bg-indigo-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">¿Querés recibir más consejos?</h2>
            <p className="text-indigo-100 mb-8">
              Suscribite a nuestro newsletter y recibí las mejores guías de mantenimiento para tu hogar directamente en tu email.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Tu correo electrónico"
                className="flex-1 px-6 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg"
              >
                Suscribirme
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
