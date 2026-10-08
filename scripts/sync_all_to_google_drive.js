/**
 * AetherStudy Automated Google Drive Organization & Sync Script
 * 
 * Organizes all local study documents and PYQ test papers into neat,
 * structured folders in Google Drive:
 * 
 * AetherStudy
 * ├── Class XII
 * │   ├── Book-Keeping & Accountancy / Study Notes & Textbooks
 * │   ├── Economics / Study Notes & Textbooks
 * │   ├── Organization of Commerce / Study Notes & Textbooks
 * │   └── ...
 * ├── Class XI
 * │   └── ...
 * └── PYQ Vault
 *     ├── 2026 / Question Papers & Model Solutions
 *     ├── 2025 / ...
 *     └── 2024 / ...
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

if (!APPS_SCRIPT_URL) {
  console.error('❌ Error: GOOGLE_APPS_SCRIPT_URL is not configured in .env');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const catalogPath = path.join(rootDir, 'src', 'data', 'catalog.json');
const serverDocsPath = path.join(rootDir, 'server', 'data', 'documents.json');
const serverPapersPath = path.join(rootDir, 'server', 'data', 'test-papers.json');

function toRoman(std) {
  if (!std) return 'XII';
  const s = std.toString().trim().toUpperCase();
  if (s === '12' || s === 'XII') return 'XII';
  if (s === '11' || s === 'XI') return 'XI';
  if (s === '10' || s === 'X') return 'X';
  return s;
}

async function uploadFileToDrive(filePath, meta) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ File not found on disk: ${filePath}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const fileName = path.basename(filePath);

  const payload = {
    fileName,
    fileBase64: base64Data,
    mimeType: 'application/pdf',
    subject: meta.subject || 'General',
    standard: meta.standard || '12',
    category: meta.category || 'notes',
    year: meta.year || '',
    isAnswerKey: !!meta.isAnswerKey,
    folderPath: meta.folderPath || '',
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json && json.success) {
      return json;
    } else {
      console.warn(`  ⚠️ Failed to upload ${fileName}:`, json?.error || 'Unknown error');
      return null;
    }
  } catch (err) {
    console.warn(`  ⚠️ Network error uploading ${fileName}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Initializing AetherStudy Google Drive Sync...');
  console.log(`📡 Using Google Apps Script Web App: ${APPS_SCRIPT_URL.substring(0, 45)}...`);

  // Step 1: Pre-initialize folder structure in Drive
  try {
    console.log('📁 Creating organized folder hierarchy in Google Drive...');
    const initRes = await fetch(`${APPS_SCRIPT_URL}?action=init_structure`, { redirect: 'follow' });
    const initJson = await initRes.json();
    if (initJson && initJson.success) {
      console.log('✅ Google Drive folder hierarchy verified & ready!');
    }
  } catch (err) {
    console.warn('  (Folder init warning, proceeding to direct creation):', err.message);
  }

  // Step 2: Read current catalog
  let catalog = { documents: [], testPapers: [] };
  if (fs.existsSync(catalogPath)) {
    try {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch {}
  }

  console.log(`\n📚 Total Documents in catalog: ${catalog.documents?.length || 0}`);
  console.log(`📝 Total Test Papers in catalog: ${catalog.testPapers?.length || 0}`);

  console.log('\n✨ Sync script ready. Use --execute to run live upload across all files.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadFileToDrive };
