export interface TestPaper {
  id: string;
  title: string;
  subject: string;
  year: number;
  examType: 'PYQ' | 'Midterm' | 'Final Exam' | 'Mock Test';
  questionPdfUrl: string;
  questionPdfName: string;
  answerKeyPdfUrl: string;
  answerKeyPdfName: string;
  durationMinutes?: number;
  totalMarks?: number;
  uploadedBy: string;
  uploadedAt: string;
}
