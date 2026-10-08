export interface SyllabusChapter {
  id: string;
  title: string;
  isCompleted: boolean;
  notes?: string;
}

export interface SyllabusTopic {
  id: string;
  title: string;
  subject: string;
  chapters: SyllabusChapter[];
  isExpanded?: boolean;
}

export interface SubjectSyllabus {
  subject: string;
  topics: SyllabusTopic[];
}
