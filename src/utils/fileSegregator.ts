/**
 * Intelligent File Name & Path Segregation Engine
 * Automatically extracts Standard, Subject, Category (Notes vs PYQ), Year, and QP/Solution roles.
 */

export interface SegregatedFile {
  originalFile?: File;
  filePath?: string;
  fileName: string;
  fileSizeBytes?: number;
  category: 'notes' | 'pyq' | 'textbook';
  standard: '12' | '11' | '10' | 'ALL';
  subject: string;
  cleanTitle: string;
  
  // Specific to PYQ
  year?: number;
  session?: string; // 'March', 'July', etc.
  pyqRole?: 'question' | 'solution'; // question paper vs answer key/solution
  pairKey?: string; // unique hash to link QP with Solution
  selected?: boolean;
}

export interface PairedPYQ {
  id: string;
  pairKey: string;
  title: string;
  subject: string;
  year: number;
  standard: '12' | '11' | '10' | 'ALL';
  session?: string;
  questionFile?: SegregatedFile;
  solutionFile?: SegregatedFile;
}

export const SUBJECT_PATTERNS: { name: string; pattern: RegExp }[] = [
  {
    name: 'Accounts',
    pattern: /\b(book\s*keeping|account|accountancy|bk|accounts)\b/i,
  },
  {
    name: 'Economics',
    pattern: /\b(economics|eco|micro|macro)\b/i,
  },
  {
    name: 'Mathematics',
    pattern: /\b(mathematics|maths|math|statistics|stats|calculus)\b/i,
  },
  {
    name: 'OCM',
    pattern: /\b(organisation\s*of\s*commerce|organization\s*of\s*commerce|ocm|commerce\s*and\s*management|principles\s*of\s*management)\b/i,
  },
  {
    name: 'IT',
    pattern: /\b(information\s*technology|info\s*technology|cyber\s*law|it|web\s*design|libre\s*office)\b/i,
  },
  {
    name: 'English',
    pattern: /\b(english|yuvakbharati|grammar|prose|poem|poems|drama|novel|novels|writing\s*skills)\b/i,
  },
  {
    name: 'Hindi',
    pattern: /\b(hindi)\b/i,
  },
  {
    name: 'Marathi',
    pattern: /\b(marathi)\b/i,
  },
  {
    name: 'Secretarial Practice',
    pattern: /\b(secretarial\s*practice|sp)\b/i,
  },
];

export const normalizeDetectionText = (text: string): string => {
  return text.toLowerCase().replace(/[-_./\\(),]+/g, ' ');
};

export const detectSubject = (text: string): string => {
  const normalized = normalizeDetectionText(text);
  for (const item of SUBJECT_PATTERNS) {
    if (item.pattern.test(normalized)) {
      return item.name;
    }
  }
  return 'General';
};

export const detectStandard = (text: string): '12' | '11' | '10' | 'ALL' => {
  const normalized = text.toLowerCase();
  if (/\b(hsc|std[_\s-]?12|class[_\s-]?12|12th)\b/i.test(normalized)) return '12';
  if (/\b(fyjc|std[_\s-]?11|class[_\s-]?11|11th)\b/i.test(normalized)) return '11';
  if (/\b(ssc|std[_\s-]?10|class[_\s-]?10|10th)\b/i.test(normalized)) return '10';
  return '12'; // Default to HSC Class 12
};

export const detectYear = (text: string): number | undefined => {
  // Matches 2010 through 2030
  const match = text.match(/\b(20[1-3][0-9])\b/);
  return match ? parseInt(match[1], 10) : undefined;
};

export const detectSession = (text: string): string | undefined => {
  const normalized = text.toLowerCase();
  if (normalized.includes('july') || normalized.includes('jul')) return 'July';
  if (normalized.includes('march') || normalized.includes('mar')) return 'March';
  if (normalized.includes('october') || normalized.includes('oct')) return 'October';
  if (normalized.includes('nov') || normalized.includes('november')) return 'November';
  if (normalized.includes('prelim') || normalized.includes('prelims')) return 'Prelims';
  if (normalized.includes('midterm')) return 'Midterm';
  return undefined;
};

export const detectCategory = (text: string): 'notes' | 'pyq' | 'textbook' => {
  const normalized = text.toLowerCase();
  if (
    normalized.includes('qp') ||
    normalized.includes('question') ||
    normalized.includes('solution') ||
    normalized.includes('answer') ||
    normalized.includes('pyq') ||
    normalized.includes('paper') ||
    normalized.includes('model_answer') ||
    normalized.includes('hsc_commerce_20') ||
    Boolean(detectYear(text) && (normalized.includes('march') || normalized.includes('july')))
  ) {
    return 'pyq';
  }
  if (normalized.includes('textbook') || normalized.includes('balbharati')) {
    return 'textbook';
  }
  return 'notes';
};

export const detectPYQRole = (text: string): 'question' | 'solution' => {
  const normalized = text.toLowerCase();
  if (
    normalized.includes('solution') ||
    normalized.includes('solutions') ||
    normalized.includes('answer') ||
    normalized.includes('answers') ||
    normalized.includes('_ans') ||
    normalized.includes('_sol') ||
    normalized.includes('_ms') ||
    normalized.includes('model_answer') ||
    normalized.includes('key')
  ) {
    return 'solution';
  }
  return 'question';
};

/**
 * Intelligent Single File Segregator
 */
export const segregateFile = (fileName: string, fullPath: string = ''): SegregatedFile => {
  const combined = `${fullPath} ${fileName}`.replace(/[\\/]/g, ' ');
  const category = detectCategory(combined);
  const standard = detectStandard(combined);
  const subject = detectSubject(combined);
  const year = detectYear(combined);
  const session = detectSession(combined);
  const pyqRole = category === 'pyq' ? detectPYQRole(combined) : undefined;

  // Clean title construction
  let cleanTitle = fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
  
  // Refine title for PYQs
  if (category === 'pyq' && year) {
    const sessionStr = session ? ` ${session}` : '';
    const roleStr = pyqRole === 'solution' ? 'Model Solution' : 'Question Paper';
    cleanTitle = `HSC ${year}${sessionStr} ${subject} ${roleStr}`;
  }

  // Generate pairing hash for PYQs: e.g. "12_accounts_2026_march"
  let pairKey: string | undefined = undefined;
  if (category === 'pyq' && year) {
    const normSub = subject.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normSession = (session || 'annual').toLowerCase();
    pairKey = `${standard}_${normSub}_${year}_${normSession}`;
  }

  return {
    fileName,
    filePath: fullPath || fileName,
    category,
    standard,
    subject,
    cleanTitle,
    year,
    session,
    pyqRole,
    pairKey,
  };
};

/**
 * Pairs a list of segregated files into grouped PYQ Exam Papers
 */
export const pairPYQFiles = (files: SegregatedFile[]): PairedPYQ[] => {
  const pairsMap = new Map<string, PairedPYQ>();

  files
    .filter((f) => f.category === 'pyq' && f.year)
    .forEach((f) => {
      const key = f.pairKey || `${f.standard}_${f.subject}_${f.year}`;
      let item = pairsMap.get(key);

      if (!item) {
        const sessionStr = f.session ? ` (${f.session})` : '';
        item = {
          id: `pyq-${key}`,
          pairKey: key,
          title: `HSC ${f.year}${sessionStr} ${f.subject} Board Paper`,
          subject: f.subject,
          year: f.year || new Date().getFullYear(),
          standard: f.standard,
          session: f.session,
        };
        pairsMap.set(key, item);
      }

      if (f.pyqRole === 'solution') {
        item.solutionFile = f;
      } else {
        item.questionFile = f;
      }
    });

  return Array.from(pairsMap.values()).sort((a, b) => b.year - a.year);
};
