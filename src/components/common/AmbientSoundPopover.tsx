import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Volume2, VolumeX, X, Check } from 'lucide-react';
import { ambientAudio, AmbientSoundType } from '../../services/ambientAudio';

const SOUNDS: { id: AmbientSoundType; label: string; desc: string; icon: string }[] = [
  { id: 'alpha40', label: '40Hz Alpha Waves', desc: 'Binaural carrier waves for high memory retention', icon: '🧠' },
  { id: 'rain', label: 'Rooftop Rain', desc: 'Synthesized pink noise blocking environmental distraction', icon: '🌧️' },
  { id: 'brown', label: 'Deep Brown Noise', desc: 'Low-frequency hum calming pre-exam anxiety', icon: '🌊' },
  { id: 'clock', label: 'Exam Room Pacer', desc: 'Subtle 60 BPM rhythm training writing pace', icon: '⏱️' },
];

export const AmbientSoundPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSound, setCurrentSound] = useState<AmbientSoundType>('none');
  const [volume, setVolume] = useState<number>(0.5);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectSound = (type: AmbientSoundType) => {
    if (currentSound === type) {
      ambientAudio.stop();
      setCurrentSound('none');
    } else {
      ambientAudio.play(type);
      setCurrentSound(type);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ambientAudio.setVolume(newVol);
  };

  const isPlaying = currentSound !== 'none';

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ios-pill cursor-pointer ${
          isPlaying
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25 ring-1 ring-purple-500/30 animate-pulse'
            : 'ios-glass text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-black/[0.06] dark:border-white/[0.08]'
        }`}
        title="Ambient Study Audio Synthesizer (100% Free & Offline)"
      >
        <Headphones className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
        <span className="hidden sm:inline">
          {isPlaying ? 'Focus Audio On' : 'Ambient Audio'}
        </span>
        {isPlaying && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 ios-glass border border-black/[0.08] dark:border-white/[0.12] rounded-[24px] p-4.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-none">Binaural Focus Audio</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  100% Free Synthesizer • Zero Data • Offline
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sound Options List */}
          <div className="space-y-1.5 py-3">
            {SOUNDS.map((s) => {
              const active = currentSound === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSound(s.id)}
                  className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left ${
                    active
                      ? 'bg-purple-600/15 border border-purple-500/40 text-purple-950 dark:text-purple-200'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-lg">{s.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span className="truncate">{s.label}</span>
                        {active && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-500 text-white shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                  {active ? (
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-black/15 dark:border-white/20 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Volume Control */}
          <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>Volume</span>
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-purple-600 h-1.5 bg-black/10 dark:bg-white/10 rounded-full cursor-pointer"
            />
          </div>

          {/* Quick Mute Action */}
          {isPlaying && (
            <button
              onClick={() => {
                ambientAudio.stop();
                setCurrentSound('none');
              }}
              className="w-full mt-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Ambient Sound</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
