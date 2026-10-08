const { execSync } = require('child_process');
const readline = require('readline');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { stdio: 'inherit', encoding: 'utf8', ...options });
  } catch (error) {
    if (options.ignoreError) return null;
    console.error(`\n❌ Command failed: ${cmd}`);
    process.exit(1);
  }
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

async function main() {
  console.log('\n=============================================================');
  console.log('🚀 AetherStudy Automated GitHub & Vercel Deployment Pipeline');
  console.log('=============================================================\n');

  // Step 1: Verify Git status
  console.log('🔍 [1/5] Checking Git repository status...');
  const currentBranch = runSilent('git rev-parse --abbrev-ref HEAD') || 'main';
  console.log(`   Branch: ${currentBranch}`);

  // Step 2: Validate TypeScript & Vite production build
  console.log('\n🔨 [2/5] Running TypeScript compilation & production build check...');
  run('npm run build');
  console.log('   ✓ Production build validated successfully.');

  // Step 3: Check for changes & Stage
  console.log('\n📦 [3/5] Staging workspace files...');
  run('git add .');

  const statusOutput = runSilent('git status --porcelain');
  const hasChanges = statusOutput.length > 0;

  // Custom commit message from CLI args or prompt/auto-timestamp
  const userArgs = process.argv.slice(2).join(' ').trim();
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const commitMsg = userArgs || `chore(release): auto-deploy update (${timestamp})`;

  if (hasChanges) {
    console.log(`\n📝 [4/5] Creating commit: "${commitMsg}"`);
    run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  } else {
    console.log('\n📝 [4/5] Working tree clean. No new changes to commit.');
  }

  // Step 4: Push to GitHub
  console.log(`\n🌐 [5/5] Pushing updates to GitHub (origin ${currentBranch})...`);
  run(`git push origin ${currentBranch}`);
  console.log('   ✓ Successfully pushed to GitHub!');

  // Step 5: Vercel Deployment Linkage Info
  console.log('\n=============================================================');
  console.log('✨ DEPLOYMENT COMPLETED SUCCESSFULLY!');
  console.log('=============================================================');
  console.log('1. GitHub Repository: https://github.com/BSFrameWorks5253/AetherStudy.git');
  console.log('2. Vercel Auto-Deploy: Pushing to "main" automatically triggers');
  console.log('   a production deployment on your connected Vercel project.');
  console.log('3. Vercel Dashboard: https://vercel.com/dashboard\n');

  console.log('💡 Tip: Your connected Vercel project auto-builds every push to "main".\n');
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});
