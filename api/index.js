// Vercel Serverless Function Entrypoint
// Routes all /api/* traffic directly into the hardened AetherStudy Express engine
const app = require('../server/server.js');

module.exports = app;
