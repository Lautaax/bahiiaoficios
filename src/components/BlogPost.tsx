import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Clock, Tag, Share2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { BLOG_POSTS } from '../data/blogData';
import { CachedImage } from './CachedImage';

export const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = React.useState(false);

  const post = BLOG_POSTS.find(p => p.id === id || p.slug === id);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Artículo no encontrado</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">El consejo o guía que estás buscando no existe o fue reubicado.</p>
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al Blog de Consejos
        </Link>
      </div>
    );
  }

  // Related posts from same or different categories
  const relatedPosts = BLOG_POSTS.filter(p => p.id !== post.id).slice(0, 3);

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back button and share */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700"
        >
          <ArrowLeft size={14} /> Volver a Consejos
        </Link>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700"
        >
          <Share2 size={13} />
          <span>{copied ? '¡Enlace copiado!' : 'Compartir'}</span>
        </button>
      </div>

      {/* Category Pill */}
      <div className="mb-4">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/50">
          <Tag size={12} />
          {post.category}
        </span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 leading-tight tracking-tight">
          {post.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {post.excerpt}
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <User size={14} className="text-slate-400" /> {post.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-400" /> {post.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" /> {post.readTime} de lectura
          </span>
        </div>
      </div>

      {/* Main Image */}
      <div className="aspect-video w-full rounded-2xl overflow-hidden mb-10 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <CachedImage 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-full object-cover"
          containerClassName="w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Article Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-700/80 mb-12">
        <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          {post.content.split('\n\n').map((paragraph, index) => {
            const clean = paragraph.trim();
            if (!clean) return null;

            if (clean.startsWith('### ')) {
              return (
                <h3 key={index} className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4 border-t border-slate-100 dark:border-slate-700/60 first:border-t-0 first:pt-0">
                  {clean.replace('### ', '')}
                </h3>
              );
            }

            return (
              <p key={index} className="leading-relaxed">
                {clean}
              </p>
            );
          })}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Temas:</span>
            {post.tags.map(tag => (
              <span 
                key={tag}
                className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Banner */}
        <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">¿Necesitás ayuda con este rubro en Bahía Blanca?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Encontrá profesionales calificados y solicitá presupuestos gratis en Bahía Oficios.</p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors text-center shrink-0"
          >
            Buscar Profesionales
          </Link>
        </div>
      </div>

      {/* Related Posts */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Otros consejos recomendados</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {relatedPosts.map(rel => (
            <Link
              key={rel.id}
              to={`/blog/${rel.slug}`}
              className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mb-2 inline-block">
                  {rel.category}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                  {rel.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  {rel.excerpt}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Leer consejo →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
};
