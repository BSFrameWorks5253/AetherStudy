const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const BASE_OUT_DIR = path.resolve(__dirname, '../data/hsc-commerce-papers');
const QUESTIONS_DIR = path.join(BASE_OUT_DIR, 'Questions');
const SOLUTIONS_DIR = path.join(BASE_OUT_DIR, 'Solutions');

// Ensure directories exist
fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
fs.mkdirSync(SOLUTIONS_DIR, { recursive: true });

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'target_commerce_data.json'), 'utf8'));

// Helper to sanitize subject name
function cleanSubject(title, linkTitle) {
  const combined = (title + ' ' + (linkTitle || '')).toLowerCase();
  if (combined.includes('math') && (combined.includes('2') || combined.includes('part ii') || combined.includes('paper ii'))) {
    return 'Mathematics_and_Statistics_Part2';
  }
  if (combined.includes('math') && (combined.includes('1') || combined.includes('part i') || combined.includes('paper i'))) {
    return 'Mathematics_and_Statistics_Part1';
  }
  if (combined.includes('math')) return 'Mathematics_and_Statistics';
  if (combined.includes('bk') || combined.includes('book keeping') || combined.includes('bookkeeping') || combined.includes('account')) {
    return 'Book_Keeping_and_Accountancy';
  }
  if (combined.includes('oc') || combined.includes('organisation') || combined.includes('organization')) {
    return 'Organisation_of_Commerce_and_Management';
  }
  if (combined.includes('sp') || combined.includes('secretarial')) {
    return 'Secretarial_Practice';
  }
  if (combined.includes('eco') || combined.includes('economics')) {
    return 'Economics';
  }
  if (combined.includes('eng') || combined.includes('english')) {
    return 'English';
  }
  if (combined.includes('hin') || combined.includes('hindi')) {
    return 'Hindi';
  }
  if (combined.includes('mar') || combined.includes('marathi')) {
    return 'Marathi';
  }
  if (combined.includes('it') || combined.includes('information tech')) {
    return 'Information_Technology';
  }
  if (combined.includes('zip') || combined.includes('all')) {
    return 'All_Subjects_Bundle';
  }
  
  return title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Helper to parse session and year
function parseSessionYear(sessionTitle, linkTitle) {
  let year = 'UnknownYear';
  let session = 'Annual';

  const text = (sessionTitle + ' ' + (linkTitle || '')).toLowerCase();

  const yearMatch = text.match(/\b(20[12]\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  if (text.includes('jul')) session = 'July';
  else if (text.includes('mar')) session = 'March';
  else if (text.includes('feb')) session = 'February';
  else if (text.includes('oct')) session = 'October';
  else if (text.includes('nov')) session = 'November';

  return { year, session };
}

// Flatten all items
const allItems = [];
catalog.data.items.forEach(sec => {
  (sec.items || []).forEach(it => {
    const { year, session } = parseSessionYear(sec.title, it.link_title);
    const subject = cleanSubject(it.title, it.link_title);
    allItems.push({
      identifier: it.identifier,
      title: it.title,
      link_title: it.link_title,
      redirect_url: it.redirect_url,
      sessionGroup: sec.title,
      year,
      session,
      subject
    });
  });
});

console.log(`Loaded ${allItems.length} papers from catalog.`);

// Helper to extract PDF URL from Next.js detail page
async function getPdfUrl(redirectSlug) {
  const pageUrl = redirectSlug.startsWith('http') 
    ? redirectSlug 
    : `https://targetpublications.org/download/${redirectSlug}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };

  try {
    const res = await fetch(pageUrl, { headers });
    if (!res.ok) {
      console.warn(`[WARN] Status ${res.status} for ${pageUrl}`);
      return null;
    }
    const html = await res.text();
    const unescaped = html.replace(/\\"/g, '"').replace(/\\\//g, '/');

    // 1. Direct cdn download_url in Next.js payload or HTML
    const directPdf = unescaped.match(/https?:\/\/cdn\.targetpublications\.org[^\s"'\<\>]+?\.pdf/i);
    if (directPdf) {
      return directPdf[0];
    }

    // 2. Check if redirection_type is EXTERNAL_URL
    const extMatch = unescaped.match(/"redirection_type"\s*:\s*"EXTERNAL_URL"\s*,\s*"redirect_url"\s*:\s*"([^"]+)"/i)
      || unescaped.match(/https?:\/\/(?:www\.)?targetpublications\.org\/content\/downloads\/[^\s"'\<\>]+/i);

    if (extMatch) {
      let extUrl = extMatch[1] || extMatch[0];
      const extRes = await fetch(extUrl, { headers });
      if (extRes.ok) {
        const extHtml = await extRes.text();
        const extPdf = extHtml.match(/https?:\/\/cdn\.targetpublications\.org[^\s"'\<\>]+?\.(?:pdf|zip)/i)
          || extHtml.match(/https?:\/\/[^\s"'\<\>]+?\.(?:pdf|zip)/i);
        if (extPdf) {
          return extPdf[0];
        }
      }
    }

    // 3. Any fallback PDF URL
    const anyPdf = unescaped.match(/https?:\/\/[^\s"'\<\>]+?\.pdf/i);
    if (anyPdf) {
      return anyPdf[0];
    }
  } catch (err) {
    console.error(`[ERROR] Fetching ${pageUrl}:`, err.message);
  }
  return null;
}

// Helper to download a PDF file
async function downloadPdf(url, targetPath) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} when downloading ${url}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(buffer));
  return buffer.byteLength;
}

// Process single item
async function processItem(item, idx, total) {
  const yearDir = path.join(QUESTIONS_DIR, item.year);
  fs.mkdirSync(yearDir, { recursive: true });

  const ext = item.subject === 'All_Subjects_Bundle' ? '.zip' : '.pdf';
  const qpFilename = `HSC_Commerce_${item.year}_${item.session}_${item.subject}_QP${ext}`;
  const qpFilePath = path.join(yearDir, qpFilename);

  // Check if already downloaded and valid
  if (fs.existsSync(qpFilePath) && fs.statSync(qpFilePath).size > 1000) {
    const size = fs.statSync(qpFilePath).size;
    console.log(`[${idx + 1}/${total}] [CACHED] ${qpFilename} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
    return {
      ...item,
      qpFile: path.relative(BASE_OUT_DIR, qpFilePath).replace(/\\/g, '/'),
      qpSize: size,
      status: 'cached'
    };
  }

  // Resolve download link
  const fileUrl = await getPdfUrl(item.redirect_url);
  if (!fileUrl) {
    console.error(`[${idx + 1}/${total}] [FAILED] No URL for ${item.link_title} (${item.redirect_url})`);
    return { ...item, status: 'no_pdf_url' };
  }

  try {
    const actualExt = fileUrl.endsWith('.zip') ? '.zip' : '.pdf';
    const finalFilename = qpFilename.replace(/\.(pdf|zip)$/, actualExt);
    const finalFilePath = path.join(yearDir, finalFilename);

    const size = await downloadPdf(fileUrl, finalFilePath);
    console.log(`[${idx + 1}/${total}] [DOWNLOADED] ${finalFilename} (${(size / (1024 * 1024)).toFixed(2)} MB)`);

    // Check PDF for answer key / solution section
    let hasAnswerKey = false;
    let solutionFilePath = null;
    if (actualExt === '.pdf') {
      try {
        const bytes = fs.readFileSync(finalFilePath);
        const rawText = bytes.toString('latin1');
        if (/answer\s*key|model\s*answer|solution\s*sheet/i.test(rawText)) {
          hasAnswerKey = true;
          const solYearDir = path.join(SOLUTIONS_DIR, item.year);
          fs.mkdirSync(solYearDir, { recursive: true });
          const solFilename = `HSC_Commerce_${item.year}_${item.session}_${item.subject}_Solution.pdf`;
          solutionFilePath = path.join(solYearDir, solFilename);
          fs.copyFileSync(finalFilePath, solutionFilePath);
          console.log(`       -> [ANSWER KEY IDENTIFIED] Copied to Solutions: ${solFilename}`);
        }
      } catch (e) {
        // ignore parse warnings
      }
    }

    return {
      ...item,
      fileUrl,
      qpFile: path.relative(BASE_OUT_DIR, finalFilePath).replace(/\\/g, '/'),
      qpSize: size,
      hasAnswerKey,
      solutionFile: solutionFilePath ? path.relative(BASE_OUT_DIR, solutionFilePath).replace(/\\/g, '/') : null,
      status: 'success'
    };
  } catch (err) {
    console.error(`[${idx + 1}/${total}] [ERROR] Downloading ${item.link_title}:`, err.message);
    return { ...item, status: 'error', error: err.message };
  }
}

// Concurrency runner
async function run() {
  console.log(`=== Starting HSC Commerce Papers Downloader (Full Resumable Run) ===`);
  console.log(`Target Output: ${BASE_OUT_DIR}`);
  console.log(`Total papers to process: ${allItems.length}\n`);

  const results = [];
  const CONCURRENCY = 4;

  for (let i = 0; i < allItems.length; i += CONCURRENCY) {
    const batch = allItems.slice(i, i + CONCURRENCY);
    const batchPromises = batch.map((item, bIdx) => processItem(item, i + bIdx, allItems.length));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    await new Promise(r => setTimeout(r, 300));
  }

  // Write catalog manifest
  const manifestPath = path.join(BASE_OUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    title: 'HSC Commerce Board Papers (Target Publications)',
    downloadedAt: new Date().toISOString(),
    totalPapers: results.length,
    successful: results.filter(r => r.status === 'success' || r.status === 'cached').length,
    failed: results.filter(r => r.status === 'error' || r.status === 'no_pdf_url').length,
    papers: results
  }, null, 2));

  console.log(`\n========================================`);
  console.log(`Download Complete!`);
  console.log(`Saved manifest to ${manifestPath}`);
  console.log(`Successful: ${results.filter(r => r.status === 'success' || r.status === 'cached').length}/${results.length}`);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
