export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimeSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // "09:00" format
  endTime: string;   // "10:30" format
  subject: string;
  topic?: string;
  color: string;     // Tailwind color preset identifier
  notes?: string;
  isCompleted?: boolean;
}

export interface SubjectCategory {
  id: string;
  name: string;
  color: string;
  textColor: string;
  borderColor: string;
}
