import React from 'react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background base tone with soothing academic focus */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#090d16] transition-colors duration-500" />

      {/* Subtle gentle ambient accents */}
      <div className="absolute -top-[10%] -left-[5%] w-[45vw] h-[45vw] rounded-full bg-brand-500/8 dark:bg-brand-600/12 blur-[100px] pointer-events-none" />
      <div className="absolute top-[45%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-sky-400/8 dark:bg-sky-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[10%] left-[30%] w-[35vw] h-[35vw] rounded-full bg-indigo-500/6 dark:bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* Clean micro-dot grid pattern for depth without visual noise */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(100,116,139,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:20px_20px]" />
    </div>
  );
};
export default LiquidBackground;
