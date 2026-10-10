// ==============================================================================
// CLOUDFLARE D1 DATABASE CLIENT (Zero-Dependency Edge HTTP Interface)
// Native serverless SQL client for AetherStudy running on Vercel
// ==============================================================================

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_D1_API_TOKEN;

const isConfigured = Boolean(ACCOUNT_ID && DATABASE_ID && API_TOKEN);

/**
 * Execute a SQL query directly against the Cloudflare D1 Edge Database
 * @param {string} sql - Parameterized SQL query string
 * @param {Array<any>} params - Query parameters for protection against SQL injection
 * @returns {Promise<Array<any>>} - Array of rows returned by query
 */
async function queryD1(sql, params = []) {
  if (!isConfigured) {
    throw new Error('Cloudflare D1 is not configured. Missing CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, or CLOUDFLARE_D1_API_TOKEN');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql,
      params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare D1 Query Failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  if (!json.success) {
    const errors = json.errors ? json.errors.map(e => e.message).join(', ') : 'Unknown D1 error';
    throw new Error(`Cloudflare D1 execution error: ${errors}`);
  }

  // Cloudflare D1 returns an array of result batches
  const batchResult = json.result?.[0];
  return batchResult?.results || [];
}

/**
 * Execute multiple SQL queries in a single atomic transaction
 * @param {Array<{ sql: string, params?: Array<any> }>} statements
 */
async function batchD1(statements) {
  if (!isConfigured) {
    throw new Error('Cloudflare D1 is not configured.');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statements),
  });

  const json = await response.json();
  if (!json.success) {
    throw new Error(`Cloudflare D1 batch failed: ${JSON.stringify(json.errors)}`);
  }

  return json.result || [];
}

module.exports = {
  isConfigured,
  queryD1,
  batchD1,
};
