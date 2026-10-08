const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'Material');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SERVER_DATA_DIR = path.join(ROOT_DIR, 'server', 'data');

const SUBJECT_PATTERNS = [
  { name: 'Accounts', pattern: /\b(book\s*keeping|account|accountancy|bk|accounts)\b/i },
  { name: 'Economics', pattern: /\b(economics|eco|micro|macro)\b/i },
  { name: 'Mathematics', pattern: /\b(mathematics|maths|math|statistics|stats|calculus)\b/i },
  { name: 'OCM', pattern: /\b(organisation\s*of\s*commerce|organization\s*of\s*commerce|ocm|commerce\s*and\s*management|principles\s*of\s*management)\b/i },
  { name: 'IT', pattern: /\b(information\s*technology|info\s*technology|cyber\s*law|it|web\s*design|libre\s*office)\b/i },
  { name: 'English', pattern: /\b(english|yuvakbharati|grammar|prose|poem|poems|drama|novel|novels|writing\s*skills)\b/i },
  { name: 'Hindi', pattern: /\b(hindi)\b/i },
  { name: 'Marathi', pattern: /\b(marathi)\b/i },
  { name: 'Secretarial Practice', pattern: /\b(secretarial\s*practice|sp)\b/i },
];

function detectSubject(text) {
  const normalized = text.toLowerCase().replace(/[-_./\\(),]+/g, ' ');
  for (const item of SUBJECT_PATTERNS) {
    if (item.pattern.test(normalized)) return item.name;
  }
  return 'General';
}

function detectStandard(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes('hsc') || /\b(std[_\s-]?12|class[_\s-]?12|12th)\b/i.test(normalized)) return '12';
  if (normalized.includes('fyjc') || normalized.includes('economics tetxual') || normalized.includes('math 1 - (commerce)') || /\b(std[_\s-]?11|class[_\s-]?11|11th)\b/i.test(normalized)) return '11';
  if (/\b(ssc|std[_\s-]?10|class[_\s-]?10|10th)\b/i.test(normalized)) return '10';
  return '11';
}

function detectYear(text) {
  const match = text.match(/\b(20[1-3][0-9])\b/);
  return match ? parseInt(match[1], 10) : undefined;
}

function detectSession(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes('july') || normalized.includes('jul')) return 'July';
  if (normalized.includes('march') || normalized.includes('mar')) return 'March';
  if (normalized.includes('october') || normalized.includes('oct')) return 'October';
  if (normalized.includes('nov') || normalized.includes('november')) return 'November';
  return 'Annual';
}

function detectPYQRole(text) {
  const normalized = text.toLowerCase();
  if (
    normalized.includes('solution') ||
    normalized.includes('solutions') ||
    normalized.includes('answer') ||
    normalized.includes('answers') ||
    normalized.includes('_ans') ||
    normalized.includes('_sol') ||
    normalized.includes('_ms') ||
    normalized.includes('model_answer')
  ) {
    return 'solution';
  }
  return 'question';
}

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push({ fullPath, fileName: file, stat });
    }
  }
  return results;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function main() {
  console.log('=====================================================');
  console.log('  AETHERSTUDY BULK UPLOADER & SEGREGATION PIPELINE  ');
  console.log('=====================================================\n');

  if (!fs.existsSync(SERVER_DATA_DIR)) {
    fs.mkdirSync(SERVER_DATA_DIR, { recursive: true });
  }

  // 1. PROCESS STUDY MATERIALS & NOTES
  console.log(`[Step 1] Scanning Notes in: ${MATERIAL_DIR}`);
  const materialFiles = walkDir(MATERIAL_DIR);
  console.log(`Found ${materialFiles.length} note files.\n`);

  const documents = [];
  for (const item of materialFiles) {
    const relPath = path.relative(ROOT_DIR, item.fullPath).replace(/\\/g, '/');
    const combined = `${item.fullPath} ${item.fileName}`.replace(/[\\/]/g, ' ');
    const subject = detectSubject(combined);
    const standard = detectStandard(combined);
    
    // Clean document title
    const baseName = path.basename(item.fileName, '.pdf').replace(/[-_]+/g, ' ').trim();
    const parentFolder = path.basename(path.dirname(item.fullPath));
    const title = `${subject}: ${baseName}`;

    documents.push({
      id: `doc-${Buffer.from(relPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`,
      name: title,
      originalName: item.fileName,
      streamUrl: `/${relPath}`,
      serverUrl: `/${relPath}`,
      subject,
      standard,
      category: 'notes',
      size: formatBytes(item.stat.size),
      sizeBytes: item.stat.size,
      folder: parentFolder,
      uploadedBy: 'bs.framework5253@gmail.com',
      uploadedAt: new Date().toISOString(),
    });
  }

  // Persist documents.json
  const docsJsonPath = path.join(SERVER_DATA_DIR, 'documents.json');
  fs.writeFileSync(docsJsonPath, JSON.stringify(documents, null, 2), 'utf8');
  console.log(`Saved ${documents.length} segregated notes into ${docsJsonPath}`);

  // Summary of Notes by Subject
  const notesBySubject = {};
  for (const doc of documents) {
    notesBySubject[doc.subject] = (notesBySubject[doc.subject] || 0) + 1;
  }
  console.log('Notes Breakdown by Subject:');
  console.table(notesBySubject);

  // 2. PROCESS PYQ EXAM PAPERS & SOLUTIONS
  console.log(`\n[Step 2] Scanning PYQs in: ${DATA_DIR}`);
  const pyqFiles = walkDir(DATA_DIR);
  console.log(`Found ${pyqFiles.length} PYQ PDF files.\n`);

  // Group by (Year + Subject + Session)
  const pyqMap = new Map();

  for (const item of pyqFiles) {
    const relPath = path.relative(ROOT_DIR, item.fullPath).replace(/\\/g, '/');
    const combined = `${item.fullPath} ${item.fileName}`.replace(/[\\/]/g, ' ');
    
    const year = detectYear(combined);
    if (!year) continue; // Skip files without a recognizable exam year

    const subject = detectSubject(combined);
    const session = detectSession(combined);
    const role = detectPYQRole(combined);
    const normSub = subject.toLowerCase().replace(/[^a-z0-9]/g, '');
    const groupKey = `${year}_${session.toLowerCase()}_${normSub}`;

    if (!pyqMap.has(groupKey)) {
      pyqMap.set(groupKey, {
        id: `tp-${year}-${normSub}-${session.toLowerCase()}`,
        title: `HSC ${year} ${session} ${subject} Board Exam Paper`,
        subject,
        year,
        examType: 'PYQ',
        durationMinutes: 180,
        totalMarks: subject.includes('Math') ? 80 : 80,
        uploadedBy: 'bs.framework5253@gmail.com',
        uploadedAt: new Date().toISOString(),
        questionPdfUrl: '',
        questionPdfName: '',
        answerKeyPdfUrl: '',
        answerKeyPdfName: '',
      });
    }

    const testPaper = pyqMap.get(groupKey);
    const streamUrl = `/${relPath}`;

    if (role === 'solution') {
      testPaper.answerKeyPdfUrl = streamUrl;
      testPaper.answerKeyPdfName = item.fileName;
    } else {
      testPaper.questionPdfUrl = streamUrl;
      testPaper.questionPdfName = item.fileName;
    }
  }

  // If a paper only has Question paper and no separate solution file yet,
  // link questionPdfUrl so viewer does not break, and mark solution as self/pending
  const testPapersList = Array.from(pyqMap.values()).map((tp) => {
    if (!tp.answerKeyPdfUrl && tp.questionPdfUrl) {
      tp.answerKeyPdfUrl = tp.questionPdfUrl;
      tp.answerKeyPdfName = `${tp.questionPdfName} (Solution In-Paper / Verification)`;
    }
    return tp;
  });

  // Sort descending by Year, then Subject
  testPapersList.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.subject.localeCompare(b.subject);
  });

  // Persist test-papers.json
  const tpJsonPath = path.join(SERVER_DATA_DIR, 'test-papers.json');
  fs.writeFileSync(tpJsonPath, JSON.stringify(testPapersList, null, 2), 'utf8');
  console.log(`Saved ${testPapersList.length} segregated PYQ papers into ${tpJsonPath}`);

  // Summary of PYQ by Year
  const pyqByYear = {};
  for (const tp of testPapersList) {
    pyqByYear[tp.year] = (pyqByYear[tp.year] || 0) + 1;
  }
  console.log('\nPYQ Breakdown by Year (2014 to 2026):');
  console.table(pyqByYear);

  // Summary of PYQ by Subject
  const pyqBySubject = {};
  for (const tp of testPapersList) {
    pyqBySubject[tp.subject] = (pyqBySubject[tp.subject] || 0) + 1;
  }
  console.log('\nPYQ Breakdown by Subject:');
  console.table(pyqBySubject);

  console.log('\nBulk Ingestion & Intelligent Segregation Finished Successfully!');
}

main();
