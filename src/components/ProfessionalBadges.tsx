import React, { useState } from 'react';
import { 
  Zap, Award, ShieldCheck, ScrollText, Crown, Clock, CheckCircle2, 
  HelpCircle, Sparkles, Check
} from 'lucide-react';
import { ProfessionalBadge } from '../types';

interface ProfessionalBadgesProps {
  badges: ProfessionalBadge[];
  variant?: 'compact' | 'detailed' | 'minimal';
  maxVisible?: number;
  className?: string;
}

export const ProfessionalBadges: React.FC<ProfessionalBadgesProps> = ({
  badges,
  variant = 'compact',
  maxVisible = 3,
  className = ''
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  if (!badges || badges.length === 0) {
    return null;
  }

  const renderIcon = (iconName: string, iconClass: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap size={11} className={iconClass} />;
      case 'Award':
        return <Award size={11} className={iconClass} />;
      case 'ShieldCheck':
        return <ShieldCheck size={11} className={iconClass} />;
      case 'ScrollText':
        return <ScrollText size={11} className={iconClass} />;
      case 'Crown':
        return <Crown size={11} className={iconClass} />;
      case 'Clock':
        return <Clock size={11} className={iconClass} />;
      case 'CheckCircle2':
        return <CheckCircle2 size={11} className={iconClass} />;
      default:
        return <Sparkles size={11} className={iconClass} />;
    }
  };

  // 1. Compact variant: Ideal for cards (small badges with tooltips)
  if (variant === 'compact') {
    const visibleBadges = badges.slice(0, maxVisible);
    const hiddenCount = badges.length - maxVisible;

    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        {visibleBadges.map((b) => (
          <div
            key={b.id}
            className="relative group cursor-help"
            onMouseEnter={() => setActiveTooltip(b.id)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <span
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold tracking-tight border transition-colors shadow-2xs
                ${b.colorClass.bg} ${b.colorClass.text} ${b.colorClass.border}
              `}
            >
              {renderIcon(b.icon, b.colorClass.icon)}
              <span className="truncate max-w-[120px]">{b.label}</span>
            </span>

            {/* Hover Tooltip */}
            <div
              className={`
                absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30
                w-48 p-2 rounded-lg bg-slate-900 text-white text-[11px] leading-tight text-center shadow-xl
                pointer-events-none border border-slate-700
              `}
            >
              <div className="font-bold mb-0.5">{b.label}</div>
              <div className="text-slate-300 text-[10px]">{b.description}</div>
              <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
            </div>
          </div>
        ))}

        {hiddenCount > 0 && (
          <span 
            className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md"
            title={badges.slice(maxVisible).map(b => b.label).join(', ')}
          >
            +{hiddenCount}
          </span>
        )}
      </div>
    );
  }

  // 2. Detailed variant: Ideal for PublicProfile / Profile
  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`
              flex items-start gap-2.5 p-3 rounded-xl border transition-all
              ${b.colorClass.bg} ${b.colorClass.border}
            `}
          >
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-2xs mt-0.5 shrink-0">
              {renderIcon(b.icon, `${b.colorClass.icon} w-4 h-4`)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className={`text-xs font-bold ${b.colorClass.text}`}>
                  {b.label}
                </h4>
                <Check size={12} className="text-emerald-500 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {b.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
