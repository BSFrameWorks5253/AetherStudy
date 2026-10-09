import React from 'react';

interface AetherLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  className?: string;
  animated?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6 rounded-lg', icon: 'w-3.5 h-3.5', text: 'text-xs' },
  sm: { box: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4', text: 'text-sm' },
  md: { box: 'w-10 h-10 rounded-2xl', icon: 'w-5 h-5', text: 'text-base' },
  lg: { box: 'w-12 h-12 rounded-[18px]', icon: 'w-6 h-6', text: 'text-lg' },
  xl: { box: 'w-16 h-16 rounded-[22px]', icon: 'w-8 h-8', text: 'text-2xl' },
};

/**
 * AetherStudy Signature Apple iOS 26 Logo Glyph
 * Features a high-precision geometric holographic 'Æ' prism monogram
 * with specular optical reflections and ambient chromatic aura.
 */
export const AetherLogo: React.FC<AetherLogoProps> = ({
  size = 'md',
  showText = false,
  textClassName = '',
  className = '',
  animated = false,
}) => {
  const cfg = SIZE_MAP[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* iOS 26 Continuous Squircle Icon Container */}
      <div
        className={`relative shrink-0 ${cfg.box} bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-[1px] shadow-lg shadow-indigo-500/20 group`}
      >
        {/* Optical Glass Core */}
        <div className="w-full h-full rounded-[inherit] bg-slate-950/90 backdrop-blur-md flex items-center justify-center relative overflow-hidden">
          {/* Ambient Inner Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 via-transparent to-cyan-400/25 pointer-events-none" />

          {/* Holographic Specular Glare */}
          <div className="absolute -top-6 -right-6 w-12 h-12 bg-white/15 rounded-full blur-sm pointer-events-none" />

          {/* Signature iOS 26 Stylized 'Æ' Prism SVG Glyph */}
          <svg
            className={`${cfg.icon} text-white relative z-10 ${
              animated ? 'hover:scale-105 transition-transform duration-300' : ''
            }`}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="aetherGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="aetherCore" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Stylized Ascending 'A' Vector Pillar */}
            <path
              d="M10 31L18.5 9C19 7.8 20.6 7.8 21.1 9L29.5 31"
              stroke="url(#aetherGlow)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Central Orbital Synergy Crossbar */}
            <path
              d="M13.5 22.5H33.5"
              stroke="url(#aetherGlow)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Futuristic 'E' High-Yield Tines */}
            <path
              d="M26 13H33.5"
              stroke="url(#aetherGlow)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d="M25 31H34"
              stroke="url(#aetherGlow)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Core Focal Crystal Spark */}
            <circle cx="20" cy="16" r="2" fill="#ffffff" className="animate-pulse" />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <span
            className={`font-black tracking-tight text-slate-900 dark:text-white leading-tight ${cfg.text} ${textClassName}`}
          >
            Aether<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">Study</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default AetherLogo;
