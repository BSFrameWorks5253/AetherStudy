const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Material\\Questions';
const DEST_PUBLIC_DIR = path.join(__dirname, '..', 'public', 'Material', 'Questions');
const SERVER_DATA_FILE = path.join(__dirname, '..', 'server', 'data', 'test-papers.json');
const CATALOG_FILE = path.join(__dirname, '..', 'src', 'data', 'catalog.json');

// Map raw filename subject segment to app canonical subject name
function mapSubject(raw) {
  const s = raw.toLowerCase().replace(/_/g, ' ');
  if (s.includes('book keeping') || s.includes('account')) {
    return 'Book-Keeping & Accountancy (Accounts)';
  }
  if (s.includes('organisation') || s.includes('organization') || s.includes('ocm')) {
    return 'Organization of Commerce & Management (OCM)';
  }
  if (s.includes('economic') || s.includes('eco')) {
    return 'Economics (ECO)';
  }
  if (s.includes('mathematics') || s.includes('math')) {
    return 'Mathematics & Statistics (Commerce)';
  }
  if (s.includes('english')) {
    return 'English (Yuvakbharati)';
  }
  if (s.includes('secretarial') || s.includes('sp')) {
    return 'Secretarial Practice (SP)';
  }
  if (s.includes('hindi')) {
    return 'Hindi';
  }
  if (s.includes('marathi')) {
    return 'Marathi';
  }
  if (s.includes('information') || s.includes('it')) {
    return 'Information Technology (IT)';
  }
  return raw.replace(/_/g, ' ');
}

// Map subject clean display title
function getCleanDisplaySubject(subject) {
  if (subject.includes('(')) {
    return subject.split('(')[0].trim();
  }
  return subject;
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source, { withFileTypes: true });
  for (const item of items) {
    const curSource = path.join(source, item.name);
    const curTarget = path.join(target, item.name);

    if (item.isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

async function run() {
  console.log('1. Checking source directory...');
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  console.log('2. Copying files to public/Material/Questions...');
  copyFolderRecursiveSync(SOURCE_DIR, DEST_PUBLIC_DIR);
  console.log('Files copied successfully.');

  console.log('3. Scanning copied files and generating TestPaper records...');
  const years = fs.readdirSync(DEST_PUBLIC_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

  const testPapers = [];

  for (const yr of years) {
    const yearDir = path.join(DEST_PUBLIC_DIR, yr);
    const files = fs.readdirSync(yearDir).filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const file of files) {
      // Regex parsing: HSC_Commerce_2026_March_Book_Keeping_and_Accountancy_QP.pdf
      // or HSC_Commerce_2026_July_...
      const match = file.match(/HSC_Commerce_(\d{4})_([A-Za-z]+)_(.+)_QP\.pdf/i);

      let parsedYear = parseInt(yr, 10);
      let session = 'March';
      let rawSubject = 'General';

      if (match) {
        parsedYear = parseInt(match[1], 10);
        session = match[2];
        rawSubject = match[3];
      } else {
        const parts = file.replace(/\.pdf$/i, '').split('_');
        const foundYear = parts.find(p => /^\d{4}$/.test(p));
        if (foundYear) parsedYear = parseInt(foundYear, 10);
        rawSubject = parts.filter(p => p !== 'HSC' && p !== 'Commerce' && p !== foundYear && p !== 'QP').join(' ');
      }

      const canonicalSubject = mapSubject(rawSubject);
      const cleanSubjectTitle = getCleanDisplaySubject(canonicalSubject);
      const id = `pyq-${parsedYear}-${session.toLowerCase()}-${rawSubject.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const title = `HSC ${parsedYear} ${session} — ${cleanSubjectTitle}`;
      const url = `/Material/Questions/${yr}/${file}`;

      testPapers.push({
        id,
        title,
        subject: canonicalSubject,
        year: parsedYear,
        examType: 'PYQ',
        questionPdfUrl: url,
        questionPdfName: file,
        answerKeyPdfUrl: url,
        answerKeyPdfName: `In-Paper Verification Key (${file})`,
        durationMinutes: 180,
        totalMarks: canonicalSubject.includes('Math') || canonicalSubject.includes('English') ? 80 : 80,
        uploadedBy: 'Maharashtra State Board (HSC)',
        uploadedAt: new Date().toISOString()
      });
    }
  }

  // Sort testPapers descending by year, then subject, then session (March before July/October)
  testPapers.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    return a.title.localeCompare(b.title);
  });

  console.log(`Generated ${testPapers.length} TestPaper records across ${years.length} years.`);

  // 4. Write to server/data/test-papers.json
  console.log(`4. Writing to ${SERVER_DATA_FILE}...`);
  fs.mkdirSync(path.dirname(SERVER_DATA_FILE), { recursive: true });
  fs.writeFileSync(SERVER_DATA_FILE, JSON.stringify(testPapers, null, 2), 'utf-8');

  // 5. Update src/data/catalog.json
  console.log(`5. Updating ${CATALOG_FILE}...`);
  let catalog = { documents: [], testPapers: [] };
  if (fs.existsSync(CATALOG_FILE)) {
    try {
      catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
    } catch {}
  }
  catalog.testPapers = testPapers;
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf-8');

  console.log('✓ Successfully ingested and synchronized all Question Papers!');
}

run().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
