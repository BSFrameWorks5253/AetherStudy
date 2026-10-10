const fs = require('fs');
const path = require('path');
require('dotenv').config();

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const dbId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const token = process.env.CLOUDFLARE_D1_API_TOKEN;

if (!accountId || !dbId || !token) {
  console.error('[MIGRATION ERROR] Missing Cloudflare D1 environment variables in .env');
  process.exit(1);
}

const sqlFile = path.join(__dirname, '../server/schema.sql');
const rawSql = fs.readFileSync(sqlFile, 'utf8');

// Strip SQL comment lines
const cleanSql = rawSql
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

// Split by semicolons
const statements = cleanSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function runMigration() {
  console.log(`🚀 Starting Cloudflare D1 Schema Migration...`);
  console.log(`Database: ${dbId} | Account: ${accountId}`);
  console.log(`Total Statements: ${statements.length}`);

  let successCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      const data = await res.json();
      if (!data.success) {
        console.error(`❌ Statement #${i + 1} Failed: ${sql.slice(0, 45)}... ->`, data.errors);
      } else {
        successCount++;
        const preview = sql.replace(/\s+/g, ' ').slice(0, 60);
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      }
    } catch (err) {
      console.error(`❌ Error on statement #${i + 1}:`, err.message);
    }
  }

  console.log(`\n🎉 Migration Complete! Successfully executed ${successCount}/${statements.length} statements.`);

  // Verify tables
  const verifyRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" }),
  });
  const verifyData = await verifyRes.json();
  const tables = verifyData.result?.[0]?.results?.map(r => r.name) || [];
  console.log(`📊 Verified Tables in Cloudflare D1:`, tables);
}

runMigration().catch(console.error);
