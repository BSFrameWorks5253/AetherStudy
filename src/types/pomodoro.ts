export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

export interface PomodoroContextType {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  sessionsCompleted: number;
  activeSubject: string | null;
  settings: PomodoroSettings;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  setMode: (mode: PomodoroMode) => void;
  setActiveSubject: (subject: string | null) => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
  startForSubject: (subjectName: string, minutes?: number) => void;
}
