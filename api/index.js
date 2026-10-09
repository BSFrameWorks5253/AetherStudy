// Vercel Serverless Function Entrypoint
// Routes all /api/* traffic directly into the hardened AetherStudy Express engine
let app;
let initError = null;

try {
  app = require('../server/server.js');
} catch (e) {
  initError = e;
  console.error('[CRITICAL] Vercel Serverless Init Error in server.js:', e);
}

module.exports = (req, res) => {
  if (initError || !app) {
    return res.status(500).json({
      error: 'AetherStudy Serverless Node Initializing',
      message: initError ? initError.message : 'Application module unavailable',
    });
  }

  // Ensure the request URL maintains the /api prefix (or preserves /uploads static routes)
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  // Handle pre-parsed body from Vercel runtime
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {}
  }

  try {
    return app(req, res);
  } catch (err) {
    console.error('[Serverless Request Handler Error]:', err);
    return res.status(500).json({ error: 'Internal serverless execution failure.' });
  }
};
