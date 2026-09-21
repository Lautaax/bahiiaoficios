import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User as UserIcon, Star, Crown, ChevronRight, Briefcase } from 'lucide-react';
import { PROFESSIONS } from '../constants';
import { User } from '../types';
import { isVipActive } from '../utils/vipUtils';

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectProfession: (professionName: string) => void;
  onSelectProfessional: (pro: User) => void;
  professionals: User[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  onSelectProfession,
  onSelectProfessional,
  professionals,
  placeholder = 'Buscar por profesión, nombre o servicio...',
  className = '',
  inputClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanTerm = value.trim().toLowerCase();

  // Filter professions
  const matchingProfessions = cleanTerm.length > 0
    ? PROFESSIONS.filter(p => 
        p.name.toLowerCase().includes(cleanTerm) ||
        p.category.toLowerCase().includes(cleanTerm)
      ).slice(0, 5)
    : [];

  // Filter professionals
  const matchingProfessionals = cleanTerm.length > 0
    ? professionals.filter(pro => {
        const nameMatches = pro.nombre.toLowerCase().includes(cleanTerm);
        const tradeMatches = (pro.profesionalInfo?.rubro || '').toLowerCase().includes(cleanTerm);
        const tradesMatches = (pro.profesionalInfo?.rubros || []).some(r => r.toLowerCase().includes(cleanTerm));
        const businessMatches = (pro.profesionalInfo?.nombreNegocio || '').toLowerCase().includes(cleanTerm);
        return nameMatches || tradeMatches || tradesMatches || businessMatches;
      }).slice(0, 5)
    : [];

  // Flattened items for keyboard navigation
  const allSuggestions = [
    ...matchingProfessions.map(p => ({ type: 'profession' as const, data: p })),
    ...matchingProfessionals.map(pro => ({ type: 'professional' as const, data: pro }))
  ];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || allSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % allSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + allSuggestions.length) % allSuggestions.length);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < allSuggestions.length) {
        e.preventDefault();
        const item = allSuggestions[highlightedIndex];
        if (item.type === 'profession') {
          onSelectProfession(item.data.name);
        } else {
          onSelectProfessional(item.data);
        }
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          if (cleanTerm.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />

      {isOpen && cleanTerm.length > 0 && allSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* Profesiones sugeridas */}
            {matchingProfessions.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Profesiones y Servicios
                </div>
                {matchingProfessions.map((prof, index) => {
                  const Icon = prof.icon;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <button
                      key={prof.name}
                      type="button"
                      onClick={() => {
                        onSelectProfession(prof.name);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                        isHighlighted 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <Icon size={15} />
                        </div>
                        <div>
                          <span className="font-semibold text-sm">{prof.name}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                            ({prof.category})
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Profesionales sugeridos */}
            {matchingProfessionals.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Profesionales en Bahía Blanca
                </div>
                {matchingProfessionals.map((pro, idx) => {
                  const globalIndex = matchingProfessions.length + idx;
                  const isHighlighted = highlightedIndex === globalIndex;
                  const isVip = isVipActive(pro.profesionalInfo);
                  return (
                    <button
                      key={pro.uid}
                      type="button"
                      onClick={() => {
                        onSelectProfessional(pro);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                        isHighlighted 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img
                            src={pro.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.nombre)}`}
                            alt={pro.nombre}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          {isVip && (
                            <span className="absolute -bottom-1 -right-1 bg-amber-400 p-0.5 rounded-full text-slate-950">
                              <Crown size={9} />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm">{pro.nombre}</span>
                            {isVip && (
                              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded">
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {pro.profesionalInfo?.rubro || 'Profesional'}
                            {pro.zona ? ` • ${pro.zona}` : ''}
                          </p>
                        </div>
                      </div>

                      {pro.profesionalInfo?.ratingAvg ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                          <Star size={12} className="fill-amber-400" />
                          <span>{pro.profesionalInfo.ratingAvg.toFixed(1)}</span>
                        </div>
                      ) : (
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
