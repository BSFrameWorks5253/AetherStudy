import React from 'react';

/**
 * Apple iOS Spatial Liquid Ambient Canvas
 * High-definition, low-overhead ambient luminous depth.
 */
export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Dynamic Base Surface */}
      <div className="absolute inset-0 bg-[#f6f8fc] dark:bg-[#07090f] transition-colors duration-500" />

      {/* Luminous Spatial Radial Lights (Zero-overhead radial gradients, 120fps hardware accelerated) */}
      <div className="absolute -top-[10%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12)_0%,rgba(168,85,247,0.06)_40%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.18)_0%,rgba(168,85,247,0.09)_45%,transparent_70%)] pointer-events-none transform-gpu" />
      <div className="absolute top-[30%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.10)_0%,rgba(6,182,212,0.05)_40%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15)_0%,rgba(6,182,212,0.07)_45%,transparent_70%)] pointer-events-none transform-gpu" />
      <div className="absolute -bottom-[15%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.10)_0%,rgba(217,70,239,0.05)_40%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,rgba(217,70,239,0.07)_45%,transparent_70%)] pointer-events-none transform-gpu" />

      {/* Ultra-Fine Optical Micro-Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.035)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
    </div>
  );
};
export default LiquidBackground;
