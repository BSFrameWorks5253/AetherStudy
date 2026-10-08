import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PomodoroContextType, PomodoroMode, PomodoroSettings } from '../types/pomodoro';
import { playNotificationTone } from '../utils/timeUtils';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
};

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load settings from localStorage or fallback
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('omnistudy_pomodoro_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [mode, setModeState] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(settings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('omnistudy_pomodoro_sessions');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // Sync settings changes to localStorage
  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('omnistudy_pomodoro_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getDurationForMode = useCallback(
    (m: PomodoroMode): number => {
      switch (m) {
        case 'work':
          return settings.workMinutes * 60;
        case 'shortBreak':
          return settings.shortBreakMinutes * 60;
        case 'longBreak':
          return settings.longBreakMinutes * 60;
      }
    },
    [settings]
  );

  const setMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
      setModeState(newMode);
      setTimeLeft(getDurationForMode(newMode));
    },
    [getDurationForMode]
  );

  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(getDurationForMode(mode));
  }, [getDurationForMode, mode]);

  const handleSessionComplete = useCallback(() => {
    playNotificationTone();

    if (mode === 'work') {
      const nextSessions = sessionsCompleted + 1;
      setSessionsCompleted(nextSessions);
      localStorage.setItem('omnistudy_pomodoro_sessions', nextSessions.toString());

      if (nextSessions % settings.longBreakInterval === 0) {
        setModeState('longBreak');
        setTimeLeft(settings.longBreakMinutes * 60);
        setIsRunning(settings.autoStartBreaks);
      } else {
        setModeState('shortBreak');
        setTimeLeft(settings.shortBreakMinutes * 60);
        setIsRunning(settings.autoStartBreaks);
      }
    } else {
      setModeState('work');
      setTimeLeft(settings.workMinutes * 60);
      setIsRunning(settings.autoStartWork);
    }
  }, [mode, sessionsCompleted, settings]);

  const skipSession = useCallback(() => {
    setIsRunning(false);
    if (mode === 'work') {
      setMode('shortBreak');
    } else {
      setMode('work');
    }
  }, [mode, setMode]);

  const startForSubject = useCallback(
    (subjectName: string, minutes?: number) => {
      setActiveSubject(subjectName);
      setModeState('work');
      const duration = minutes ? minutes * 60 : settings.workMinutes * 60;
      setTimeLeft(duration);
      setIsRunning(true);
    },
    [settings.workMinutes]
  );

  // Interval execution effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handleSessionComplete]);

  // Update window title with timer
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const subjectPrefix = activeSubject ? `[${activeSubject}] ` : '';
    document.title = isRunning ? `${formatted} - ${subjectPrefix}AetherStudy` : 'AetherStudy';
  }, [timeLeft, isRunning, activeSubject]);

  return (
    <PomodoroContext.Provider
      value={{
        mode,
        timeLeft,
        isRunning,
        sessionsCompleted,
        activeSubject,
        settings,
        startTimer,
        pauseTimer,
        resetTimer,
        skipSession,
        setMode,
        setActiveSubject,
        updateSettings,
        startForSubject,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = (): PomodoroContextType => {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};
