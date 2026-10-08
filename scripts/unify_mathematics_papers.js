const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const BASE_DIR = path.resolve(__dirname, '../data/hsc-commerce-papers');
const QUESTIONS_DIR = path.join(BASE_DIR, 'Questions');

async function unifyMaths() {
  console.log('=== Unifying Mathematics & Statistics Papers across all years ===');
  
  const years = fs.readdirSync(QUESTIONS_DIR).filter(y => fs.statSync(path.join(QUESTIONS_DIR, y)).isDirectory()).sort();

  for (const year of years) {
    const yDir = path.join(QUESTIONS_DIR, year);
    const files = fs.readdirSync(yDir);

    // 1. Check for modern years (2020-2026) where Part2 was erroneously appended
    const part2Only = files.filter(f => f.includes('Mathematics_and_Statistics_Part2_QP.pdf'));
    for (const f of part2Only) {
      const sessionMatch = f.match(/HSC_Commerce_\d{4}_([a-zA-Z]+)_/);
      const session = sessionMatch ? sessionMatch[1] : 'Annual';
      const part1Name = `HSC_Commerce_${year}_${session}_Mathematics_and_Statistics_Part1_QP.pdf`;
      const hasPart1 = fs.existsSync(path.join(yDir, part1Name));

      if (!hasPart1) {
        // This is a single complete paper that was misnamed as Part2
        const correctName = `HSC_Commerce_${year}_${session}_Mathematics_and_Statistics_QP.pdf`;
        const oldPath = path.join(yDir, f);
        const newPath = path.join(yDir, correctName);
        fs.renameSync(oldPath, newPath);
        console.log(`[RENAMED] (${year}) ${f} -> ${correctName}`);
      }
    }

    // 2. Check for legacy years (2014-2019) where Part1 and Part2 exist separately
    // We will merge them into a unified single paper: HSC_Commerce_{Year}_{Session}_Mathematics_and_Statistics_QP.pdf
    const sessions = ['March', 'July', 'October', 'February'];
    for (const session of sessions) {
      const p1Name = `HSC_Commerce_${year}_${session}_Mathematics_and_Statistics_Part1_QP.pdf`;
      const p2Name = `HSC_Commerce_${year}_${session}_Mathematics_and_Statistics_Part2_QP.pdf`;
      const p1Path = path.join(yDir, p1Name);
      const p2Path = path.join(yDir, p2Name);

      if (fs.existsSync(p1Path) && fs.existsSync(p2Path)) {
        const unifiedName = `HSC_Commerce_${year}_${session}_Mathematics_and_Statistics_QP.pdf`;
        const unifiedPath = path.join(yDir, unifiedName);

        console.log(`[MERGING] (${year} ${session}) Merging Part 1 & Part 2 -> ${unifiedName}...`);
        const doc1 = await PDFDocument.load(fs.readFileSync(p1Path));
        const doc2 = await PDFDocument.load(fs.readFileSync(p2Path));

        const merged = await PDFDocument.create();
        const pages1 = await merged.copyPages(doc1, doc1.getPageIndices());
        pages1.forEach(p => merged.addPage(p));
        const pages2 = await merged.copyPages(doc2, doc2.getPageIndices());
        pages2.forEach(p => merged.addPage(p));

        const mergedBytes = await merged.save();
        fs.writeFileSync(unifiedPath, mergedBytes);
        console.log(`  -> Created Unified ${unifiedName} (${merged.getPageCount()} total pages, ${(mergedBytes.length / 1024).toFixed(1)} KB)`);

        // Remove the separate fragmented part files so directory is completely clean and uniform
        fs.unlinkSync(p1Path);
        fs.unlinkSync(p2Path);
        console.log(`  -> Cleaned up separate Part1 and Part2 files.`);
      } else if (fs.existsSync(p1Path) && !fs.existsSync(p2Path)) {
        // Only Part 1 exists
        const unifiedName = `HSC_Commerce_${year}_${session}_Mathematics_and_Statistics_QP.pdf`;
        fs.renameSync(p1Path, path.join(yDir, unifiedName));
        console.log(`[RENAMED] (${year} ${session}) ${p1Name} -> ${unifiedName}`);
      } else if (!fs.existsSync(p1Path) && fs.existsSync(p2Path)) {
        // Only Part 2 exists
        const unifiedName = `HSC_Commerce_${year}_${session}_Mathematics_and_Statistics_QP.pdf`;
        fs.renameSync(p2Path, path.join(yDir, unifiedName));
        console.log(`[RENAMED] (${year} ${session}) ${p2Name} -> ${unifiedName}`);
      }
    }
  }

  console.log('\nUnification complete! Rebuilding catalog summary...');
}

unifyMaths().catch(console.error);
