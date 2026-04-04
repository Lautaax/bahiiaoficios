import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TradeDiscount } from '../types';
import { Tag, MapPin, ExternalLink, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export const TradeDiscounts: React.FC = () => {
  const [discounts, setDiscounts] = useState<TradeDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const q = query(collection(db, 'tradeDiscounts'), where('active', '==', true));
        const querySnapshot = await getDocs(q);
        const fetchedDiscounts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TradeDiscount[];
        setDiscounts(fetchedDiscounts);
      } catch (error) {
        console.error("Error fetching trade discounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, []);

  const categories = ['Todas', ...Array.from(new Set(discounts.map(d => d.category)))];

  const filteredDiscounts = discounts.filter(d => {
    const matchesSearch = d.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         d.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Beneficios para el Gremio</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Descuentos exclusivos en comercios locales para los profesionales de Bahía Oficios.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar comercios o beneficios..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select
            className="pl-10 pr-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredDiscounts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <Tag size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No se encontraron beneficios en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDiscounts.map((discount, index) => (
            <motion.div
              key={discount.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 group"
            >
              <div className="h-48 overflow-hidden relative">
                {discount.imageUrl ? (
                  <img 
                    src={discount.imageUrl} 
                    alt={discount.businessName} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <Tag size={48} className="text-indigo-200 dark:text-indigo-800" />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">
                  {discount.discount} OFF
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                    {discount.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{discount.businessName}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {discount.description}
                </p>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-6">
                  <MapPin size={16} />
                  <span>{discount.address}</span>
                </div>
                {discount.link && (
                  <a
                    href={discount.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    Ver más
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
