// Vercel Serverless Function Entrypoint
// Routes all /api/* traffic directly into the hardened AetherStudy Express engine
const app = require('../server/server.js');

module.exports = (req, res) => {
  // Ensure the request URL maintains the /api prefix (or preserves /uploads static routes)
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
