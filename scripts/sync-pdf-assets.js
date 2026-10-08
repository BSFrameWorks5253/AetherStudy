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

console.log('✅ PDF Material & PYQ Data sync complete!');
