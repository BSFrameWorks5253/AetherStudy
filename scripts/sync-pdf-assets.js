const fs = require('fs');
const path = require('path');

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

// 4. Sync server/data documents and test papers into src/data/catalog.json
try {
  const serverDocsPath = path.join(rootDir, 'server', 'data', 'documents.json');
  const serverPapersPath = path.join(rootDir, 'server', 'data', 'test-papers.json');
  const catalogPath = path.join(rootDir, 'src', 'data', 'catalog.json');
  
  let catalog = {};
  if (fs.existsSync(catalogPath)) {
    try {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch {}
  }
  
  let changed = false;
  if (fs.existsSync(serverDocsPath)) {
    try {
      const docs = JSON.parse(fs.readFileSync(serverDocsPath, 'utf8'));
      if (Array.isArray(docs) && docs.length > 0) {
        catalog.documents = docs;
        changed = true;
      }
    } catch {}
  }
  if (fs.existsSync(serverPapersPath)) {
    try {
      const papers = JSON.parse(fs.readFileSync(serverPapersPath, 'utf8'));
      if (Array.isArray(papers) && papers.length > 0) {
        catalog.testPapers = papers;
        changed = true;
      }
    } catch {}
  }
  
  if (changed) {
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`  -> Catalog updated with ${catalog.documents?.length || 0} docs and ${catalog.testPapers?.length || 0} papers.`);
  }
} catch (err) {
  console.warn('  -> Could not sync catalog.json:', err.message);
}

console.log('✅ PDF Material & PYQ Data sync complete!');
