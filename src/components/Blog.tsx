import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, User, ArrowRight, BookOpen, Clock, Tag, X, Search, 
  ShieldCheck, AlertTriangle, CheckCircle2, ExternalLink, Share2, Sparkles, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BLOG_POSTS, BLOG_CATEGORIES, BlogPost } from '../data/blogData';

export const Blog: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter posts by category and search query
  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      const matchesCategory = selectedCategory === 'Todos' || post.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        post.title.toLowerCase().includes(q) || 
        post.excerpt.toLowerCase().includes(q) || 
        post.content.toLowerCase().includes(q) ||
        post.tags.some(t => t.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Featured post: always the first in the filtered list or post #1
  const featuredPost = filteredPosts[0];
  const gridPosts = filteredPosts.slice(1);

  const handleShare = (post: BlogPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/blog/${post.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold mb-4 border border-indigo-100 dark:border-indigo-900/50">
            <BookOpen size={14} />
            <span>GUÍAS TÉCNICAS & CONSEJOS BAHÍA BLANCA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
            Mantenimiento y Consejos para tu Hogar
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Recomendaciones prácticas, normativas de Camuzzi y EDES, prevención de accidentes y pautas para contratar oficios de forma segura.
          </p>
        </div>

        {/* Quick Decalogue Banner */}
        <div className="mb-10 bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-none">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                5 Reglas de Oro antes de contratar cualquier oficio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pautas indispensables para evitar sobrecostos, estafas y riesgos en el hogar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">1. Esquema 30/30/40</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Nunca pagues el 100% de adelanto. 30% anticipo, 30% a mitad de obra y 40% al probar conformidad.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">2. Verificá Matrículas</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                En gas y electricidad, solicitá la credencial vigente y corrobórala ante Camuzzi o Colegio de Técnicos.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">3. Presupuesto Escrito</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Asegurate de que detalle mano de obra, qué materiales incluye, plazo en días y período de garantía.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">4. Ventilaciones Libres</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Jamás tapes las rejillas de gas por frío. El monóxido de carbono no avisa y se cobra vidas cada invierno.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">5. Probá el Disyuntor</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Presioná el botón 'T' del disyuntor 1 vez por mes. Si no salta de inmediato, llamá a un electricista urgente.
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar consejos (gas, humedad, disyuntor, seña, techos...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 self-end md:self-center">
              Mostrando {filteredPosts.length} de {BLOG_POSTS.length} artículos
            </span>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {BLOG_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0
                    ${isSelected
                      ? 'bg-indigo-600 text-white shadow-none'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }
                  `}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-8">
            <AlertTriangle size={36} className="mx-auto text-amber-500 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              No encontramos guías con ese criterio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Intentá con otras palabras clave o seleccioná otra categoría.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Restablecer Filtros
            </button>
          </div>
        )}

        {/* Featured Post Card */}
        {featuredPost && (
          <div className="mb-10">
            <div
              onClick={() => setSelectedPost(featuredPost)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden lg:grid lg:grid-cols-12 cursor-pointer group hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="relative h-60 lg:h-full lg:col-span-5 overflow-hidden">
                <img
                  src={featuredPost.imageUrl}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
                    Guía Destacada
                  </span>
                </div>
              </div>

              <div className="p-6 lg:p-8 lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" /> {featuredPost.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" /> {featuredPost.date}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                    {featuredPost.title}
                  </h2>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5 line-clamp-3">
                    {featuredPost.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {featuredPost.tags.slice(0, 4).map(t => (
                      <span key={t} className="text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" /> {featuredPost.author}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleShare(featuredPost, e)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Copiar enlace"
                    >
                      <Share2 size={14} />
                    </button>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Leer guía completa <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular Posts Grid */}
        {gridPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {gridPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer group shadow-none"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-slate-400" /> {post.readTime}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" /> {post.date}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {post.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px] truncate max-w-[170px]">
                      {post.author}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs flex items-center gap-1">
                      Leer <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal for Reading Full Article */}
        <AnimatePresence>
          {selectedPost && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative border border-slate-200 dark:border-slate-700 shadow-xl"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="absolute top-4 right-4 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-xs"
                  aria-label="Cerrar modal"
                >
                  <X size={20} />
                </button>

                {/* Hero image */}
                <div className="h-56 sm:h-72 w-full relative overflow-hidden">
                  <img
                    src={selectedPost.imageUrl}
                    alt={selectedPost.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">
                      {selectedPost.category}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                      {selectedPost.title}
                    </h2>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" /> {selectedPost.author}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {selectedPost.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {selectedPost.readTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShare(selectedPost)}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Share2 size={12} />
                        <span>{copied ? '¡Copiado!' : 'Compartir'}</span>
                      </button>
                      <Link
                        to={`/blog/${selectedPost.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg font-semibold hover:underline"
                      >
                        <ExternalLink size={12} />
                        <span>Link Permanente</span>
                      </Link>
                    </div>
                  </div>

                  {/* Formatted paragraphs */}
                  <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                    {selectedPost.content.split('\n\n').map((para, i) => {
                      const trimmed = para.trim();
                      if (!trimmed) return null;

                      if (trimmed.startsWith('### ')) {
                        return (
                          <h3 key={i} className="text-base sm:text-lg font-bold text-slate-900 dark:text-white pt-4 border-t border-slate-100 dark:border-slate-700/60">
                            {trimmed.replace('### ', '')}
                          </h3>
                        );
                      }

                      return (
                        <p key={i} className="leading-relaxed">
                          {trimmed}
                        </p>
                      );
                    })}
                  </div>

                  {/* Tags */}
                  {selectedPost.tags && (
                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400 mr-1">Etiquetas:</span>
                      {selectedPost.tags.map(tag => (
                        <span key={tag} className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bottom Action */}
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Link
                      to="/dashboard"
                      className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors text-center"
                    >
                      Buscar Profesionales en Bahía Blanca
                    </Link>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Cerrar Guía
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Newsletter CTA */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-10 text-center border border-slate-200/80 dark:border-slate-700/80">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              ¿Querés recibir más consejos técnicos y normativas?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
              Recibí guías preventivas de invierno, advertencias de Camuzzi y alertas ante temporales directamente en tu casilla.
            </p>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                alert('¡Gracias por suscribirte a las guías de Bahía Oficios!');
              }} 
              className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="Tu correo electrónico..."
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                required
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shrink-0"
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
