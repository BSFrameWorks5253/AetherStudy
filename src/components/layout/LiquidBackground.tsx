import React from 'react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background base tone */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-sky-50 dark:from-[#030712] dark:via-[#0b0f19] dark:to-[#020617] transition-colors duration-500" />

      {/* Floating Organic Liquid Glass Orbs */}
      <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-purple-500/20 via-brand-500/15 to-transparent blur-3xl animate-float-slow dark:from-purple-900/30 dark:via-brand-700/20" />
      <div className="absolute top-[40%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-cyan-400/20 via-teal-400/15 to-transparent blur-3xl animate-float-reverse dark:from-cyan-900/25 dark:via-teal-900/15" />
      <div className="absolute -bottom-[15%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-indigo-500/15 via-rose-400/10 to-transparent blur-3xl animate-pulse-subtle dark:from-indigo-950/40 dark:via-rose-950/20" />

      {/* Delicate Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
    </div>
  );
};
