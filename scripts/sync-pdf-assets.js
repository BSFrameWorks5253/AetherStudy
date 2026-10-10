const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🔄 Syncing PDF Material & PYQ Data into public/ and dist/...');
const rootDir = path.resolve(__dirname, '..');

// 1. Sync Material/ -> public/Material
const materialSrc = path.join(rootDir, 'Material');
const materialDest = path.join(rootDir, 'public', 'Material');
if (fs.existsSync(materialSrc)) {
  console.log('  -> Copying Material/ to public/Material...');
  copyDirRecursive(materialSrc, materialDest);
}

// 2. Sync data/ -> public/data
const dataSrc = path.join(rootDir, 'data');
const dataDest = path.join(rootDir, 'public', 'data');
if (fs.existsSync(dataSrc)) {
  console.log('  -> Copying data/ to public/data...');
  copyDirRecursive(dataSrc, dataDest);
}

// 3. If dist exists, also copy directly to dist/ for immediate availability
const distMaterial = path.join(rootDir, 'dist', 'Material');
const distData = path.join(rootDir, 'dist', 'data');
if (fs.existsSync(path.join(rootDir, 'dist'))) {
  if (fs.existsSync(materialSrc)) {
    console.log('  -> Copying Material/ to dist/Material...');
    copyDirRecursive(materialSrc, distMaterial);
  }
  if (fs.existsSync(dataSrc)) {
    console.log('  -> Copying data/ to dist/data...');
    copyDirRecursive(dataSrc, distData);
  }
}

// 4. Scan public/Material and generate catalog documents
function inferDoc(fileName, folderName, relPath, sizeBytes) {
  const fLower = folderName.toLowerCase();
  const nameLower = fileName.toLowerCase();

  let subject = 'General';
  let category = 'notes';
  let chapterNumber = 'All';
  let chapterTitle = '';
  let customFilter = 'Theory Notes';

  // 1. Identify Subject
  if (fLower.includes('eco') || nameLower.includes('eco')) {
    subject = 'Economics (ECO)';
    if (fLower.includes('textual') || nameLower.includes('textual')) {
      customFilter = 'Textual Questions';
    } else {
      customFilter = 'Conceptual Notes';
    }
  } else if (fLower.includes('ocm') || nameLower.includes('ocm')) {
    subject = 'Organization of Commerce & Management (OCM)';
    customFilter = 'Finals Notes';
  } else if (fLower.includes('bk') || nameLower.includes('b.k') || nameLower.includes('book')) {
    subject = 'Book-Keeping & Accountancy (Accounts)';
    customFilter = 'Practical Notes';
  } else if (fLower.includes('math') || nameLower.includes('math')) {
    subject = 'Mathematics & Statistics (Commerce)';
    customFilter = 'Solved Notes';
  } else if (
    fLower.includes('hsc grammar') ||
    fLower.includes('novel') ||
    fLower.includes('poem') ||
    fLower.includes('prose') ||
    fLower.includes('writing') ||
    nameLower.includes('grammar') ||
    nameLower.includes('drama') ||
    nameLower.includes('poem') ||
    nameLower.includes('prose') ||
    nameLower.includes('writing')
  ) {
    subject = 'English (Yuvakbharati)';
    if (nameLower.includes('grammar')) customFilter = 'Grammar';
    else if (nameLower.includes('drama') || nameLower.includes('novel')) customFilter = 'Novel & Drama';
    else if (nameLower.includes('poem')) customFilter = 'Poetry';
    else if (nameLower.includes('prose')) customFilter = 'Prose';
    else if (nameLower.includes('writing')) customFilter = 'Writing Skills';
  } else if (fLower.includes('i.t') || nameLower.includes('it') || nameLower.includes('cyber')) {
    subject = 'Information Technology (IT)';
    customFilter = 'Theory & QB';
  }

  // 2. Identify Chapter Number & Title
  const chMatch = fileName.match(/(?:ch|chapter|chp|chpt)[_\s.-]*0*(\d+)/i) || fileName.match(/^(\d+)[_\s.-]/);
  if (chMatch && chMatch[1]) {
    const num = parseInt(chMatch[1], 10);
    if (fLower.includes('math 1')) {
      chapterNumber = `Part 1 • ${num}`;
    } else {
      chapterNumber = `Chapter ${num}`;
    }
  } else if (nameLower.includes('partition')) {
    chapterNumber = 'Part 2 • 1';
    chapterTitle = 'Partition Values';
  } else if (nameLower.includes('measures of dispersion') || nameLower.includes('dispersion')) {
    chapterNumber = 'Part 2 • 2';
    chapterTitle = 'Measures of Dispersion';
  } else if (nameLower.includes('skewness')) {
    chapterNumber = 'Part 2 • 3';
    chapterTitle = 'Skewness';
  } else if (nameLower.includes('bivariate')) {
    chapterNumber = 'Part 2 • 4';
    chapterTitle = 'Bivariate Frequency';
  } else if (nameLower.includes('coorelation') || nameLower.includes('correlation')) {
    chapterNumber = 'Part 2 • 5';
    chapterTitle = 'Correlation';
  } else if (nameLower.includes('cyber law') || nameLower.includes('cyber')) {
    chapterNumber = 'Chapter 4';
    chapterTitle = 'Cyber Law';
  } else if (nameLower.includes('grammar')) {
    chapterNumber = 'Section 5';
    chapterTitle = 'Grammar';
  } else if (nameLower.includes('prose')) {
    chapterNumber = 'Section 1';
    chapterTitle = 'Prose';
  } else if (nameLower.includes('poem')) {
    chapterNumber = 'Section 2';
    chapterTitle = 'Poetry';
  } else if (nameLower.includes('writing')) {
    chapterNumber = 'Section 3';
    chapterTitle = 'Writing Skills';
  } else if (nameLower.includes('novel') || nameLower.includes('drama')) {
    chapterNumber = 'Section 4';
    chapterTitle = 'Novel / Drama';
  }

  const cleanName = fileName.replace(/\.pdf$/i, '').trim();
  const id = 'mat-' + crypto.createHash('md5').update(relPath).digest('hex');

  return {
    id,
    name: cleanName,
    originalName: fileName,
    url: relPath,
    streamUrl: relPath,
    serverUrl: relPath,
    mimeType: 'application/pdf',
    sizeBytes,
    size: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
    uploadedAt: '2026-10-10T12:00:00.000Z',
    uploadedBy: 'Mind Faces Faculty',
    subject,
    standard: '12',
    category,
    chapterNumber,
    chapterTitle,
    customFilter,
    tags: [customFilter, subject.split(' ')[0]],
    uploadCount: 1,
  };
}

function scanMaterial(dir, baseDir) {
  let docs = [];
  if (!fs.existsSync(dir)) return docs;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'Questions') {
        docs = docs.concat(scanMaterial(full, baseDir));
      }
    } else if (item.toLowerCase().endsWith('.pdf')) {
      const rel = '/Material/' + path.relative(baseDir, full).replace(/\\/g, '/');
      const doc = inferDoc(item, path.basename(dir), rel, stat.size);
      docs.push(doc);
    }
  }
  return docs;
}

try {
  const scanTarget = fs.existsSync(materialDest) ? materialDest : materialSrc;
  const scannedDocs = scanMaterial(scanTarget, scanTarget);
  console.log(`  -> Scanned ${scannedDocs.length} study material documents from ${scanTarget}`);

  const serverDocsPath = path.join(rootDir, 'server', 'data', 'documents.json');
  const serverPapersPath = path.join(rootDir, 'server', 'data', 'test-papers.json');
  const catalogPath = path.join(rootDir, 'src', 'data', 'catalog.json');
  const publicCatalogPath = path.join(rootDir, 'public', 'data', 'catalog.json');
  const distCatalogPath = path.join(rootDir, 'dist', 'data', 'catalog.json');

  let catalog = { documents: [], testPapers: [] };
  if (fs.existsSync(catalogPath)) {
    try {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch {}
  }

  // Clean slate: all subject study documents removed as requested by user
  catalog.documents = [];

  // Load test papers
  if (fs.existsSync(serverPapersPath)) {
    try {
      const papers = JSON.parse(fs.readFileSync(serverPapersPath, 'utf8'));
      if (Array.isArray(papers) && papers.length > 0) {
        catalog.testPapers = papers;
      }
    } catch {}
  }

  // Write out updated catalog and server documents
  const catalogStr = JSON.stringify(catalog, null, 2);
  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(catalogPath, catalogStr, 'utf8');

  fs.mkdirSync(path.dirname(publicCatalogPath), { recursive: true });
  fs.writeFileSync(publicCatalogPath, catalogStr, 'utf8');

  if (fs.existsSync(path.dirname(serverDocsPath))) {
    fs.writeFileSync(serverDocsPath, JSON.stringify(catalog.documents, null, 2), 'utf8');
  }

  if (fs.existsSync(path.join(rootDir, 'dist'))) {
    fs.mkdirSync(path.dirname(distCatalogPath), { recursive: true });
    fs.writeFileSync(distCatalogPath, catalogStr, 'utf8');
  }

  console.log(`  -> Catalog written with ${catalog.documents.length} docs and ${catalog.testPapers?.length || 0} test papers.`);
} catch (err) {
  console.warn('  -> Could not sync catalog.json:', err.message);
}

console.log('✅ PDF Material & PYQ Data sync complete!');
