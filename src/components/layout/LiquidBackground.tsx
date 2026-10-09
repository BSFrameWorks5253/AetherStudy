import React from 'react';

/**
 * Apple iOS Spatial Liquid Ambient Canvas
 * High-definition, low-overhead ambient luminous depth.
 */
export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Dynamic Base Surface */}
      <div className="absolute inset-0 bg-[#f6f8fc] dark:bg-[#07090f] transition-colors duration-700" />

      {/* Luminous Spatial Radial Lights */}
      <div className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-transparent dark:from-indigo-600/15 dark:via-purple-600/12 blur-[64px] md:blur-[120px] transform-gpu will-change-transform pointer-events-none" />
      <div className="absolute top-[35%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-bl from-sky-400/8 via-cyan-500/6 to-transparent dark:from-sky-500/12 dark:via-cyan-600/10 blur-[64px] md:blur-[130px] transform-gpu will-change-transform pointer-events-none" />
      <div className="absolute -bottom-[20%] left-[25%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-t from-violet-600/8 via-fuchsia-500/6 to-transparent dark:from-violet-700/12 dark:via-purple-800/10 blur-[64px] md:blur-[120px] transform-gpu will-change-transform pointer-events-none" />

      {/* Ultra-Fine Optical Noise & Micro-Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.04)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
    </div>
  );
};
export default LiquidBackground;
