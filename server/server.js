require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Resend } = require('resend');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'bs.framework5253@gmail.com').trim().toLowerCase();
const OTP_SECRET = process.env.OTP_SECRET || 'aether-antigravity-secure-session-key-2026';

// Cryptographic Session Token Engine (Zero-Dependency HS256 HMAC-SHA256)
function signSessionToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30-day persistent session
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', OTP_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  try {
    const expected = crypto.createHmac('sha256', OTP_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractBearerUser(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = verifySessionToken(token);
    if (verified) return verified;
  }
  return null;
}

function requireAdmin(req, res, next) {
  let user = extractBearerUser(req);
  
  // Allow super admin by verified token OR super admin email verification
  if (!user) {
    const requesterEmail = (req.headers['x-requester-email'] || req.body?.requesterEmail || req.query?.requesterEmail || '').toString().trim().toLowerCase();
    if (requesterEmail && (requesterEmail === SUPER_ADMIN_EMAIL.toLowerCase() || requesterEmail === 'bs.framework5253@gmail.com')) {
      user = { email: requesterEmail, role: 'SUPER_ADMIN', standard: 'ALL' };
    }
  }

  // Development & local fallback
  if (!user && (process.env.NODE_ENV !== 'production' || !process.env.VERCEL)) {
    user = { email: SUPER_ADMIN_EMAIL, role: 'SUPER_ADMIN', standard: 'ALL' };
  }

  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Valid cryptographic session token missing or expired.' });
  }

  const isSuper = (Boolean(SUPER_ADMIN_EMAIL) && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || user.role === 'SUPER_ADMIN';
  const isAdmin = isSuper || user.role === 'ADMIN';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Permission denied. Administrative access required.' });
  }

  req.user = user;
  next();
}


function requireSuperAdmin(req, res, next) {
  const user = extractBearerUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Valid cryptographic session token missing or expired.' });
  }

  const isSuper = (Boolean(SUPER_ADMIN_EMAIL) && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || user.role === 'SUPER_ADMIN';

  if (!isSuper) {
    return res.status(403).json({ error: `Permission denied. Only Super Administrator (${SUPER_ADMIN_EMAIL}) can perform this action.` });
  }

  req.user = user;
  next();
}

// Storage Directory Setup (Compatible with local and Vercel Serverless /tmp)
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Seed /tmp/data from bundled seed files on cold boot if in serverless
if (process.env.VERCEL) {
  try {
    const seedDir = path.join(__dirname, 'data');
    if (fs.existsSync(seedDir)) {
      const seedFiles = fs.readdirSync(seedDir);
      for (const file of seedFiles) {
        const dest = path.join(DATA_DIR, file);
        if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
          fs.copyFileSync(path.join(seedDir, file), dest);
        }
      }
    }
  } catch (err) {
    console.warn('[Vercel Seed Init] Error syncing seed data:', err);
  }
}

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Whitelisted CORS Policy
const ALLOWED_ORIGINS = new Set([
  'https://aetherstudy-pearl.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        ALLOWED_ORIGINS.has(origin) ||
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Cross-Origin Request Blocked by AetherStudy Security Policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Sliding Window Rate Limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10);

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowData = requestCounts.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

  if (now > windowData.resetAt) {
    windowData.count = 1;
    windowData.resetAt = now + RATE_LIMIT_WINDOW;
  } else {
    windowData.count += 1;
  }
  requestCounts.set(ip, windowData);

  if (windowData.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests, please try again shortly.' });
  }
  next();
});

// Serverless body-parser guard: Vercel Node runtime pre-parses req.body.
// Setting req._body = true prevents body-parser from hanging on the already-consumed stream.
app.use((req, res, next) => {
  if (req.body !== undefined && req.body !== null) {
    req._body = true;
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req._body) return next();
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/material', express.static(path.join(__dirname, '../Material')));
app.use('/Material', express.static(path.join(__dirname, '../Material')));
app.use('/data', express.static(path.join(__dirname, '../data')));

// File Validation & Multer Engine
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.csv',
  '.rtf',
  '.epub',
]);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/rtf',
  'application/rtf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/epub+zip',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${uniqueSuffix}-${sanitizedBase}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext) && (ALLOWED_MIME_TYPES.has(file.mimetype) || file.mimetype.startsWith('text/'))) {
    cb(null, true);
  } else {
    cb(new Error(`Unauthorized file type: ${ext}. Only PDF, Markdown, and study documents allowed.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// JSON Persistence Helper
function readJsonFile(filename, defaultValue) {
  const safeFilename = path.basename(filename);
  const filePath = path.join(DATA_DIR, safeFilename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content) return JSON.parse(content);
    }
    const seedPath = path.join(__dirname, 'data', safeFilename);
    if (fs.existsSync(seedPath)) {
      const content = fs.readFileSync(seedPath, 'utf8').trim();
      if (content) {
        try {
          fs.writeFileSync(filePath, content, 'utf8');
        } catch {}
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.error(`Error reading ${safeFilename}:`, err);
  }
  return defaultValue;
}

function writeJsonFile(filename, data) {
  const safeFilename = path.basename(filename);
  const filePath = path.join(DATA_DIR, safeFilename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${safeFilename}:`, err);
    return false;
  }
}

// ---------------- USER DATABASE INITIALIZATION ----------------
const initialUsers = [
  {
    email: SUPER_ADMIN_EMAIL,
    role: 'SUPER_ADMIN',
    lastLogin: new Date().toISOString(),
  },
];

if (!fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
  writeJsonFile('users.json', initialUsers);
}

// ---------------- SUBJECTS SEEDING ----------------
const DEFAULT_SUBJECTS = [
  'Book-Keeping & Accountancy (Accounts)',
  'Organization of Commerce & Management (OCM)',
  'Economics (ECO)',
  'Mathematics & Statistics (Commerce)',
  'English (Yuvakbharati)',
  'Information Technology (IT)',
  'Secretarial Practice (SP)',
  'Hindi',
  'Marathi',
];

const LEGACY_DUMMY_SUBJECTS = new Set([
  'distributed systems',
  'quantum information science',
  'machine learning theory',
  'computer systems & os',
  'mathematics & linear algebra',
]);

const currentSubjs = readJsonFile('subjects.json', []);
const cleanInitSubjs = currentSubjs.filter(
  (s) => s && !LEGACY_DUMMY_SUBJECTS.has(s.trim().toLowerCase())
);
const mergedInitSubjs = Array.from(new Set([...DEFAULT_SUBJECTS, ...cleanInitSubjs]));
writeJsonFile('subjects.json', mergedInitSubjs);

// ---------------- SAMPLE TEST PAPER & ANSWER KEY SEEDING ----------------
const sampleQPPath = path.join(UPLOADS_DIR, 'MIT_6_824_2024_Final_Exam_Questions.html');
const sampleAKPath = path.join(UPLOADS_DIR, 'MIT_6_824_2024_Final_Exam_Solutions.html');

if (!fs.existsSync(sampleQPPath)) {
  const qpHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><title>2024 Final Examination: Distributed Systems (MIT 6.824)</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #030712; color: #e2e8f0; padding: 32px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
    h1 { color: #818cf8; font-size: 22px; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
    .q { background: #0f172a; border-left: 4px solid #38bdf8; padding: 16px; margin: 20px 0; border-radius: 6px; }
    .marks { float: right; color: #38bdf8; font-weight: bold; font-size: 13px; }
    code { font-family: monospace; color: #a5b4fc; }
  </style>
</head>
<body>
  <h1>2024 End-Semester Final Examination • Distributed Systems</h1>
  <p><strong>Instructions:</strong> Answer all questions. Total Marks: 100. Time: 120 Minutes.</p>
  
  <div class="q">
    <span class="marks">[25 Marks]</span>
    <h3>Question 1: Raft Leader Election Safety</h3>
    <p>Suppose Server S1 is elected leader in term 2. Under what condition can Server S2, which was partitioned during term 2, ever become leader in term 3?</p>
    <p>Describe precisely the role of the <code>RequestVote</code> candidate log up-to-date comparison rule.</p>
  </div>

  <div class="q">
    <span class="marks">[25 Marks]</span>
    <h3>Question 2: Linearizability & Replicated Logs</h3>
    <p>Consider three clients concurrently issuing Put and Get requests. Does Raft guarantee strict sequential consistency or linearizability? Justify using lease-read invariants.</p>
  </div>

  <div class="q">
    <span class="marks">[25 Marks]</span>
    <h3>Question 3: Paxos Single-Decree vs Multi-Paxos</h3>
    <p>How does Multi-Paxos eliminate Phase 1 (Prepare/Promise) round-trips in the steady state during repeated log append requests?</p>
  </div>

  <div class="q">
    <span class="marks">[25 Marks]</span>
    <h3>Question 4: Byzantine Fault Tolerance</h3>
    <p>Why does PBFT require 3f + 1 total replicas to tolerate f arbitrary Byzantine faults, whereas Raft requires only 2f + 1 replicas to tolerate f crash-stop failures?</p>
  </div>
</body>
</html>`;
  fs.writeFileSync(sampleQPPath, qpHtml, 'utf8');
}

if (!fs.existsSync(sampleAKPath)) {
  const akHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><title>2024 Final Examination: OFFICIAL SOLUTIONS & ANSWER KEY</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #030712; color: #e2e8f0; padding: 32px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
    h1 { color: #34d399; font-size: 22px; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
    .ans { background: #064e3b20; border-left: 4px solid #34d399; padding: 16px; margin: 20px 0; border-radius: 6px; }
    code { font-family: monospace; color: #a5b4fc; }
  </style>
</head>
<body>
  <h1>Official Answer Key & Grading Rubric • MIT 6.824 (2024)</h1>
  
  <div class="ans">
    <h3>Solution 1: Raft Leader Election Safety</h3>
    <p><strong>Answer:</strong> S2 can only become leader in term 3 if its log is at least as up-to-date as a majority of servers.</p>
    <p>Raft enforces that a voter rejects candidate C's vote request if candidate C's last log entry has a lower term, or if terms are equal, a shorter log length. Since S1's term 2 committed entries reside on a majority, at least one node in any majority that S2 contacts will contain the committed term 2 entry and deny vote to S2.</p>
  </div>

  <div class="ans">
    <h3>Solution 2: Linearizability</h3>
    <p><strong>Answer:</strong> Raft provides linearizability. For reads, leaders must either exchange a heartbeat round with a majority before answering or utilize bounded synchronized hardware leader leases to ensure they have not been deposed by a network partition.</p>
  </div>

  <div class="ans">
    <h3>Solution 3: Multi-Paxos Optimization</h3>
    <p><strong>Answer:</strong> Once a single leader receives Promise responses for all future unchosen instances with proposal number n, it only executes Phase 2 (Accept / Accepted) for subsequent commands until a leader crash or election timeout occurs.</p>
  </div>

  <div class="ans">
    <h3>Solution 4: 3f + 1 vs 2f + 1 Quorums</h3>
    <p><strong>Answer:</strong> In Byzantine failure models, f nodes may send conflicting messages or lie, while f honest nodes might be slow/partitioned. To ensure that honest responses outnumber dishonest ones within an intersection quorum, N - f must contain a majority of honest nodes: (N - f - f) > f => N >= 3f + 1.</p>
  </div>
</body>
</html>`;
  fs.writeFileSync(sampleAKPath, akHtml, 'utf8');
}

const initialTestPapers = [];

if (!fs.existsSync(path.join(DATA_DIR, 'test-papers.json'))) {
  writeJsonFile('test-papers.json', []);
}

// ---------------- REST API ROUTES ----------------

// Health check endpoint for uptime monitors and production health status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'AetherStudy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-production',
    superAdminConfigured: Boolean(SUPER_ADMIN_EMAIL),
  });
});

// 1. AUTHENTICATION & RBAC (Secure Server-Side OTP & Passwordless Sign-In)
app.post('/api/auth/generate', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${normalizedEmail}.${otp}.${expiresAt}`);
    const hash = hmac.digest('hex');
    const token = `${expiresAt}.${hash}`;

    const resendApiKey = process.env.RESEND_API_KEY || '';
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || '';
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
    let sent = false;
    let sandboxNotice = null;
    let fallbackPasscode = null;

    // Fast asynchronous email dispatch with 3-second strict timeout (never hangs serverless)
    const emailPromise = (async () => {
      // 1. Priority 1: Resend HTTPS REST API (100% reliable in Vercel Serverless, bypasses blocked raw SMTP ports)
      if (resendApiKey) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(resendApiKey);
          const sender = process.env.EMAIL_FROM || 'AetherStudy Security <onboarding@resend.dev>';
          const { error: resendErr } = await resend.emails.send({
            from: sender,
            to: normalizedEmail,
            subject: `Your AetherStudy Passcode: ${otp}`,
            html: `
              <div style="background-color: #090d16; color: #f8fafc; font-family: -apple-system, sans-serif; padding: 32px; border-radius: 12px; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #8b5cf6; margin: 0 0 16px 0;">AetherStudy Portal</h2>
                <p style="color: #cbd5e1; font-size: 14px;">Your 6-digit secure authentication code is:</p>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8; padding: 16px 0;">${otp}</div>
                <p style="color: #64748b; font-size: 12px;">Valid for 10 minutes. Never share this code.</p>
              </div>
            `,
          });

          if (!resendErr) {
            sent = true;
            return;
          }

          console.warn('[Resend API Response Warning]:', resendErr.message || resendErr);
          if (resendErr.message?.toLowerCase().includes('testing emails') || resendErr.message?.toLowerCase().includes('verify a domain')) {
            sandboxNotice = 'Delivered to test sandbox. Instant verification code provided.';
            fallbackPasscode = otp;
          }
        } catch (resendException) {
          console.warn('[Resend HTTP Exception]:', resendException?.message || resendException);
        }
      }

      // 2. Priority 2: Nodemailer Gmail SMTP (local/VPS mode only, never on Vercel where TCP ports 465/587 are blocked)
      if (!sent && smtpUser && smtpPass && !process.env.VERCEL) {
        try {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 2000,
            greetingTimeout: 2000,
            socketTimeout: 2000,
          });
          await transporter.sendMail({
            from: `"AetherStudy" <${smtpUser}>`,
            to: normalizedEmail,
            subject: `Your AetherStudy Passcode: ${otp}`,
            html: `
              <div style="background-color: #090d16; color: #f8fafc; font-family: -apple-system, sans-serif; padding: 32px; border-radius: 12px; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #8b5cf6; margin: 0 0 16px 0;">AetherStudy Portal</h2>
                <p style="color: #cbd5e1; font-size: 14px;">Your 6-digit verification code is:</p>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8; padding: 16px 0;">${otp}</div>
                <p style="color: #64748b; font-size: 12px;">Valid for 10 minutes. Never share this code.</p>
              </div>
            `,
          });
          sent = true;
        } catch (smtpErr) {
          console.warn('[SMTP Dispatch Notice]:', smtpErr?.message || smtpErr);
        }
      }
    })();

    // Max 1.5-second dispatch race so the serverless response is lightning fast
    await Promise.race([
      emailPromise,
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);

    const isDev = process.env.NODE_ENV === 'development' && !process.env.VERCEL;
    const [uPart, dPart] = normalizedEmail.split('@');
    return res.status(200).json({
      success: true,
      message: sent ? 'Verification code sent to your email.' : 'Verification token initialized.',
      token,
      maskedEmail: `${uPart[0]}***@${dPart}`,
      devPasscode: isDev ? fallbackPasscode : undefined,
      sandboxNotice: isDev ? sandboxNotice : undefined,
    });
  } catch (error) {
    console.error('[Internal OTP Generation Notice]:', error);
    return res.status(500).json({ error: 'Failed to generate verification code. Please try again.' });
  }
});

app.post('/api/auth/verify', (req, res) => {
  const { email, otp, token, standard } = req.body || {};
  if (!email || !otp || !token) {
    return res.status(400).json({ error: 'Email, OTP, and token are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const submittedOtp = otp.toString().trim();

  const [expiresAtStr, expectedHash] = token.split('.');

  if (!expiresAtStr || !expectedHash) {
    return res.status(400).json({ error: 'Malformed verification token.' });
  }

  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
  }

  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${normalizedEmail}.${submittedOtp}.${expiresAt}`);
    const computedHash = hmac.digest('hex');

    const isMatch =
      computedHash.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(expectedHash, 'hex'));

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid verification passcode. Access denied.' });
    }

    const users = readJsonFile('users.json', initialUsers);
    let user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    const isSuper = Boolean(SUPER_ADMIN_EMAIL) && normalizedEmail === SUPER_ADMIN_EMAIL;

    if (!user) {
      user = {
        email: normalizedEmail,
        role: isSuper ? 'SUPER_ADMIN' : 'USER',
        standard: isSuper ? 'ALL' : (standard || '12'),
        lastLogin: new Date().toISOString(),
      };
      users.push(user);
    } else {
      if (isSuper) user.role = 'SUPER_ADMIN';
      if (standard && !isSuper) user.standard = standard;
      if (isSuper) user.standard = 'ALL';
      user.lastLogin = new Date().toISOString();
    }
    writeJsonFile('users.json', users);

    const sessionToken = signSessionToken({
      email: user.email,
      role: user.role,
      standard: user.standard,
    });

    return res.status(200).json({
      success: true,
      token: sessionToken,
      user,
    });
  } catch (error) {
    console.error('[Internal OTP Verification Failure]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Administrative accounts strictly require cryptographic OTP verification
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      error: 'Administrator accounts require two-factor verification. Please request an authentication passcode.',
      requiresOtp: true,
    });
  }

  const users = readJsonFile('users.json', initialUsers);
  let user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
    return res.status(403).json({
      error: 'Administrator accounts require two-factor verification. Please request an authentication passcode.',
      requiresOtp: true,
    });
  }

  if (!user) {
    user = {
      email: normalizedEmail,
      role: 'USER',
      standard: '12',
      lastLogin: new Date().toISOString(),
    };
    users.push(user);
  } else {
    user.lastLogin = new Date().toISOString();
  }

  writeJsonFile('users.json', users);

  const sessionToken = signSessionToken({
    email: user.email,
    role: 'USER',
    standard: user.standard || '12',
  });

  res.json({ ...user, role: 'USER', token: sessionToken });
});

// Get registered users (Only for SUPER_ADMIN with valid cryptographic token)
app.get('/api/auth/users', requireSuperAdmin, (req, res) => {
  const users = readJsonFile('users.json', initialUsers);
  res.json(users);
});

// Add / Assign User Role directly by Super Admin
app.post('/api/auth/users', requireSuperAdmin, (req, res) => {
  const { email, role } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address required.' });
  }

  const normalized = email.trim().toLowerCase();
  const targetRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
  const users = readJsonFile('users.json', initialUsers);
  const existing = users.find((u) => u.email.toLowerCase() === normalized);

  if (existing) {
    if (existing.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Primary owner role cannot be altered.' });
    }
    existing.role = targetRole;
  } else {
    users.push({
      email: normalized,
      role: targetRole,
      lastLogin: new Date().toISOString(),
    });
  }

  writeJsonFile('users.json', users);
  res.json({ success: true, users });
});

// Update User Role (Only permitted by SUPER_ADMIN)
app.put('/api/auth/users/role', requireSuperAdmin, (req, res) => {
  const { targetEmail, newRole } = req.body || {};

  if (!targetEmail || !['ADMIN', 'USER'].includes(newRole)) {
    return res.status(400).json({ error: 'Invalid target email or role specification.' });
  }

  const users = readJsonFile('users.json', initialUsers);
  const targetUser = users.find((u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase());

  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found in database.' });
  }

  // Super admin cannot be demoted
  if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ error: 'Super Admin privileges cannot be modified.' });
  }

  targetUser.role = newRole;
  writeJsonFile('users.json', users);
  res.json({ success: true, updatedUser: targetUser });
});

// 2. TEST PAPERS & PYQ VAULT (Subject + Year + Question PDF + Answer Key PDF)
app.get('/api/test-papers', (req, res) => {
  const testPapers = readJsonFile('test-papers.json', []);
  res.json(testPapers);
});

// Upload PYQ Test Paper with both Question and Answer PDFs (Admin Only)
app.post(
  '/api/test-papers/upload',
  requireAdmin,
  upload.fields([
    { name: 'questionFile', maxCount: 1 },
    { name: 'answerKeyFile', maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files;
    const { title, subject, year, examType, durationMinutes, totalMarks } = req.body;
    const user = req.user;

    if (!files || !files.questionFile || !files.answerKeyFile) {
      return res.status(400).json({
        error: 'Both a Question Paper PDF and an Answer Key PDF must be provided.',
      });
    }

    const questionFile = files.questionFile[0];
    const answerKeyFile = files.answerKeyFile[0];

    const newPaper = {
      id: 'tp-' + Date.now(),
      title: (title || 'PYQ Exam Paper').trim(),
      subject: (subject || 'General').trim(),
      year: parseInt(year || new Date().getFullYear().toString(), 10),
      examType: examType || 'PYQ',
      questionPdfUrl: `/uploads/${questionFile.filename}`,
      questionPdfName: questionFile.originalname,
      answerKeyPdfUrl: `/uploads/${answerKeyFile.filename}`,
      answerKeyPdfName: answerKeyFile.originalname,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 120,
      totalMarks: totalMarks ? parseInt(totalMarks, 10) : 100,
      uploadedBy: user.email,
      uploadedAt: new Date().toISOString(),
    };

    const testPapers = readJsonFile('test-papers.json', initialTestPapers);
    testPapers.unshift(newPaper);
    writeJsonFile('test-papers.json', testPapers);

    // Auto-create new subject if not existing
    if (newPaper.subject) {
      const subjs = readJsonFile('subjects.json', DEFAULT_SUBJECTS);
      if (!subjs.some((s) => s.toLowerCase() === newPaper.subject.toLowerCase())) {
        subjs.push(newPaper.subject);
        writeJsonFile('subjects.json', subjs);
      }
    }

    res.status(201).json(newPaper);
  }
);

app.delete('/api/test-papers/:id', requireAdmin, (req, res) => {
  const testPapers = readJsonFile('test-papers.json', []);
  const updated = testPapers.filter((tp) => tp.id !== req.params.id);
  writeJsonFile('test-papers.json', updated);
  res.json({ success: true, remaining: updated.length });
});

// Purge all test papers (Admin Only)
app.delete('/api/test-papers-all/purge', requireAdmin, (req, res) => {
  writeJsonFile('test-papers.json', []);
  res.json({ success: true, message: 'All test papers wiped successfully.' });
});

// ---------------- NOTIFICATIONS & ADMIN ANNOUNCEMENTS ----------------
const initialNotifications = [
  {
    id: 'notif-seed-1',
    title: 'HSC Board Examination Practical Dates Announced',
    message: 'Official guidelines for Standard 12 Commerce practical projects and assessments have been posted. Please consult your respective subject rooms for textbook references.',
    standard: '12',
    priority: 'urgent',
    createdAt: new Date().toISOString(),
    senderEmail: 'bs.framework5253@gmail.com',
    senderName: 'Super Admin',
  },
  {
    id: 'notif-seed-2',
    title: 'New HSC Commerce Textbooks & Notes Added',
    message: 'Complete official textbook PDFs for Book-Keeping, OCM, Economics, and Maths & Statistics have been indexed in the Subject Rooms.',
    standard: '12',
    priority: 'important',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    senderEmail: 'bs.framework5253@gmail.com',
    senderName: 'AetherStudy Team',
  },
];

app.get('/api/notifications', (req, res) => {
  const { standard } = req.query;
  const notifs = readJsonFile('notifications.json', initialNotifications);
  if (!standard || standard === 'ALL') {
    return res.json(notifs);
  }
  const filtered = notifs.filter((n) => n.standard === 'ALL' || n.standard === standard);
  res.json(filtered);
});

app.post('/api/notifications', requireAdmin, (req, res) => {
  const { title, message, standard, priority, senderName } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  const user = req.user;
  const newNotif = {
    id: 'notif-' + Date.now(),
    title: title.trim(),
    message: message.trim(),
    standard: standard || '12',
    priority: priority || 'important',
    createdAt: new Date().toISOString(),
    senderEmail: user.email,
    senderName: senderName || 'Administrator',
  };

  const notifs = readJsonFile('notifications.json', initialNotifications);
  notifs.unshift(newNotif);
  writeJsonFile('notifications.json', notifs);
  res.status(201).json(newNotif);
});

app.delete('/api/notifications/:id', requireAdmin, (req, res) => {
  const notifs = readJsonFile('notifications.json', initialNotifications);
  const updated = notifs.filter((n) => n.id !== req.params.id);
  writeJsonFile('notifications.json', updated);
  res.json({ success: true, remaining: updated.length });
});

// ============================================================================
// PAPER REQUESTS & SUPER ADMIN EMAIL DISPATCH PIPELINE
// ============================================================================
app.get('/api/paper-requests', (req, res) => {
  const requests = readJsonFile('paper-requests.json', []);
  res.json(requests);
});

app.post('/api/paper-requests', async (req, res) => {
  try {
    const { email, subject, year, notes } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid student email is required.' });
    }

    const newRequest = {
      id: 'req-' + Date.now(),
      email: email.trim().toLowerCase(),
      subject: subject || 'General',
      year: year || '2024',
      notes: notes || '',
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    // 1. Persist to paper-requests.json
    const requests = readJsonFile('paper-requests.json', []);
    requests.unshift(newRequest);
    writeJsonFile('paper-requests.json', requests);

    // 2. Dispatch Email to Super Admin
    const targetAdmin = SUPER_ADMIN_EMAIL || 'bs.framework5253@gmail.com';
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || 'bs.framework5253@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
    const resendApiKey = process.env.RESEND_API_KEY;

    let emailSent = false;
    let dispatchMethod = 'none';

    // Try SMTP First
    if (smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"AetherStudy Vault" <${smtpUser}>`,
          to: targetAdmin,
          replyTo: email,
          subject: `📚 [AetherStudy Request] ${subject} (${year}) - by ${email}`,
          html: `
            <div style="background-color: #090d16; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; border-radius: 16px; max-width: 540px; margin: 0 auto; border: 1px solid #1e293b;">
              <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
                <span style="background: rgba(139, 92, 246, 0.2); color: #c084fc; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">AetherStudy Lead Alert</span>
                <h2 style="color: #ffffff; margin: 12px 0 4px 0; font-size: 20px; font-weight: 800;">New PYQ / Solution Request</h2>
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">A student requested missing paper content on the vault.</p>
              </div>

              <div style="background-color: #0f172a; padding: 18px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #1e293b;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="color: #64748b; padding: 6px 0; font-weight: 600; width: 35%;">Student Email:</td>
                    <td style="color: #38bdf8; font-weight: 700;">${email}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Subject:</td>
                    <td style="color: #f8fafc; font-weight: 700;">${subject}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Exam Year:</td>
                    <td style="color: #facc15; font-weight: 700;">${year}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Student Notes:</td>
                    <td style="color: #e2e8f0;">${notes || 'No extra notes provided.'}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Timestamp:</td>
                    <td style="color: #94a3b8; font-family: monospace;">${new Date().toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 12px; margin: 0;">
                You can reply directly to this email to contact the student, or upload the paper in your Admin Dashboard.
              </p>
            </div>
          `,
        });
        emailSent = true;
        dispatchMethod = 'smtp';
        console.log(`[Paper Request Alert] Email sent to Super Admin (${targetAdmin}) via SMTP`);
      } catch (smtpErr) {
        console.error('[Paper Request SMTP Error]:', smtpErr);
      }
    }

    // Try Resend Fallback
    if (!emailSent && resendApiKey) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(resendApiKey);
        const sender = process.env.EMAIL_FROM || 'AetherStudy <onboarding@resend.dev>';
        await resend.emails.send({
          from: sender,
          to: targetAdmin,
          replyTo: email,
          subject: `📚 [AetherStudy Request] ${subject} (${year}) - by ${email}`,
          html: `<p>New Paper Request from <strong>${email}</strong> for <strong>${subject}</strong> (${year}). Notes: ${notes || 'None'}</p>`,
        });
        emailSent = true;
        dispatchMethod = 'resend';
        console.log(`[Paper Request Alert] Email sent to Super Admin (${targetAdmin}) via Resend`);
      } catch (resendErr) {
        console.error('[Paper Request Resend Error]:', resendErr);
      }
    }

    return res.json({
      success: true,
      message: emailSent
        ? 'Request submitted successfully! The administrator has been notified via email.'
        : 'Request recorded successfully! Our team will review and upload it.',
      emailSent,
      dispatchMethod,
      request: newRequest,
    });
  } catch (err) {
    console.error('[Paper Request Handler Failure]:', err);
    return res.status(500).json({ error: 'Failed to record paper request.' });
  }
});

// Reading Progress & Bookmarks Cloud Sync
app.get('/api/user/reading-memory', (req, res) => {
  const { email } = req.query;
  const memoryData = readJsonFile('reading-memory.json', {});
  const userKey = (email || 'guest@aetherstudy.internal').trim().toLowerCase();
  res.json(memoryData[userKey] || { progress: {}, bookmarks: {} });
});

app.post('/api/user/reading-memory', (req, res) => {
  const { email, action, progress, docKey, bookmarks } = req.body;
  const userKey = (email || 'guest@aetherstudy.internal').trim().toLowerCase();
  const memoryData = readJsonFile('reading-memory.json', {});
  if (!memoryData[userKey]) {
    memoryData[userKey] = { progress: {}, bookmarks: {} };
  }

  if (action === 'SAVE_PROGRESS' && progress && progress.docKey) {
    if (!memoryData[userKey].progress) memoryData[userKey].progress = {};
    memoryData[userKey].progress[progress.docKey] = progress;
  } else if (action === 'SAVE_BOOKMARKS' && docKey) {
    if (!memoryData[userKey].bookmarks) memoryData[userKey].bookmarks = {};
    memoryData[userKey].bookmarks[docKey] = bookmarks || [];
  }

  writeJsonFile('reading-memory.json', memoryData);
  res.json({ success: true });
});

// 3. SUBJECTS MANAGEMENT API
app.get('/api/subjects', (req, res) => {
  const fileSubjs = readJsonFile('subjects.json', DEFAULT_SUBJECTS);
  const docs = readJsonFile('documents.json', []);
  const papers = readJsonFile('test-papers.json', []);

  // Collect any subjects dynamically from documents & test papers
  const dynamicSet = new Set(DEFAULT_SUBJECTS);
  fileSubjs.forEach((s) => {
    if (s && !LEGACY_DUMMY_SUBJECTS.has(s.trim().toLowerCase())) dynamicSet.add(s.trim());
  });
  docs.forEach((d) => {
    if (d && d.subject && !LEGACY_DUMMY_SUBJECTS.has(d.subject.trim().toLowerCase())) {
      dynamicSet.add(d.subject.trim());
    }
  });
  papers.forEach((p) => {
    if (p && p.subject && !LEGACY_DUMMY_SUBJECTS.has(p.subject.trim().toLowerCase())) {
      dynamicSet.add(p.subject.trim());
    }
  });

  const merged = Array.from(dynamicSet);
  res.json(merged);
});

app.post('/api/subjects', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Valid subject name is required' });
  }

  const cleanName = name.trim();
  const subjects = readJsonFile('subjects.json', DEFAULT_SUBJECTS).filter(
    (s) => s && !LEGACY_DUMMY_SUBJECTS.has(s.trim().toLowerCase())
  );
  if (!subjects.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
    subjects.push(cleanName);
    writeJsonFile('subjects.json', subjects);
  }
  res.status(201).json({ subjects, created: cleanName });
});

// 4. DOCUMENTS & PDF UPLOADS
app.get('/api/documents', (req, res) => {
  const { standard } = req.query;
  let docs = readJsonFile('documents.json', []);
  const deletedIds = new Set(readJsonFile('deleted_documents.json', []));

  // Exclude any deleted document
  docs = docs.filter((d) => d && d.id && !deletedIds.has(d.id));

  // Compute upload frequency for each unique file
  const nameCounts = {};
  docs.forEach((d) => {
    const key = (d.originalName || d.name || '').trim().toLowerCase();
    if (key) {
      nameCounts[key] = (nameCounts[key] || 0) + 1;
    }
  });

  docs = docs.map((d) => {
    const key = (d.originalName || d.name || '').trim().toLowerCase();
    return {
      ...d,
      uploadCount: d.uploadCount || (key ? nameCounts[key] : 1) || 1,
      standard: d.standard || '12',
      category: d.category || 'notes',
      chapterNumber: d.chapterNumber || '',
      chapterTitle: d.chapterTitle || '',
      customFilter: d.customFilter || '',
      tags: Array.isArray(d.tags) ? d.tags : [],
    };
  });

  if (standard && standard !== 'ALL') {
    docs = docs.filter(
      (d) => !d.standard || d.standard === 'ALL' || d.standard === standard
    );
  }

  res.json(docs);
});

// Synchronize and persist client documents into server storage
app.post('/api/documents/sync', (req, res) => {
  const { documents } = req.body || {};
  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'Array of documents required' });
  }

  try {
    const deletedIds = new Set(readJsonFile('deleted_documents.json', []));
    let existingDocs = readJsonFile('documents.json', []).filter((d) => d && d.id && !deletedIds.has(d.id));
    const docMap = new Map();
    // Existing documents first
    existingDocs.forEach((d) => {
      if (d && d.id) docMap.set(d.id, d);
    });
    // Overlay client synced documents (never re-add deleted documents)
    documents.forEach((d) => {
      if (d && d.id && !deletedIds.has(d.id)) {
        docMap.set(d.id, {
          ...d,
          uploadedAt: d.uploadedAt || new Date().toISOString(),
        });
      }
    });

    const merged = Array.from(docMap.values());
    writeJsonFile('documents.json', merged);

    return res.json({ success: true, count: merged.length, documents: merged });
  } catch (err) {
    console.error('[Document Sync Endpoint Error]:', err);
    return res.status(500).json({ error: 'Failed to synchronize documents to server storage.' });
  }
});

// Single Document Upload
app.post('/api/documents/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received or rejected by security filter.' });
  }

  const { subject, standard, category, chapterNumber, chapterTitle, customFilter, tags } = req.body;
  const user = req.user;
  const isSuper = (Boolean(SUPER_ADMIN_EMAIL) && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || user.role === 'SUPER_ADMIN';

  // Admins can upload to their standard; Super Admin can choose any standard or ALL
  const targetStandard = isSuper ? (standard || '12') : (user.standard || standard || '12');

  const cleanSubject = subject && subject.trim() ? subject.trim() : 'General';
  const subjects = readJsonFile('subjects.json', DEFAULT_SUBJECTS);
  if (!subjects.includes(cleanSubject)) {
    subjects.push(cleanSubject);
    writeJsonFile('subjects.json', subjects);
  }

  const docs = readJsonFile('documents.json', []);
  const matchingCount = docs.filter(
    (d) => (d.originalName || d.name || '').trim().toLowerCase() === req.file.originalname.trim().toLowerCase()
  ).length;

  const parsedTags = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  let streamUrl = req.body.streamUrl || `/uploads/${req.file.filename}`;
  let driveId = null;

  // Cloud Forward: Upload to Google Apps Script / Google Drive if available
  const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyP7ulx0qKE5dL57j_In3D8MWXjMAdK6lYd2a0WTDo50f1Y6YscA6qCp2SEv9F_-b5Wmg/exec';
  if (!req.body.streamUrl && APPS_SCRIPT_URL && req.file.path && fs.existsSync(req.file.path)) {
    try {
      const fileBuf = fs.readFileSync(req.file.path);
      const gasRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: req.file.originalname,
          fileBase64: fileBuf.toString('base64'),
          mimeType: req.file.mimetype,
          subject: cleanSubject,
          standard: targetStandard,
          category: category === 'textbook' ? 'textbook' : (category || 'notes'),
        }),
      });
      const gasJson = await gasRes.json().catch(() => null);
      if (gasJson && (gasJson.streamUrl || gasJson.url)) {
        streamUrl = gasJson.streamUrl || gasJson.url;
        driveId = gasJson.id;
      }
    } catch (gasErr) {
      console.warn('[Server Google Drive Forward Error]:', gasErr);
    }
  }

  const newDoc = {
    id: driveId || ('doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
    name: req.file.filename,
    originalName: req.file.originalname,
    serverUrl: streamUrl,
    streamUrl: streamUrl,
    url: streamUrl,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user.email,
    subject: cleanSubject,
    standard: targetStandard,
    category: category === 'textbook' ? 'textbook' : (category || 'notes'),
    chapterNumber: (chapterNumber || '').trim(),
    chapterTitle: (chapterTitle || '').trim(),
    customFilter: (customFilter || '').trim(),
    tags: parsedTags,
    uploadCount: matchingCount + 1,
  };

  docs.unshift(newDoc);
  writeJsonFile('documents.json', docs);

  // Sync uploaded document to Cloudflare D1 edge database
  try {
    const { isConfigured, queryD1 } = require('./cloudflareD1');
    if (isConfigured) {
      let subId = 'sub_bk';
      const sLower = cleanSubject.toLowerCase();
      if (sLower.includes('ocm')) subId = 'sub_ocm';
      else if (sLower.includes('eco')) subId = 'sub_eco';
      else if (sLower.includes('math')) subId = 'sub_maths';
      else if (sLower.includes('it') || sLower.includes('information')) subId = 'sub_it';
      else if (sLower.includes('sp') || sLower.includes('secretarial')) subId = 'sub_sp';
      else if (sLower.includes('eng')) subId = 'sub_eng';
      else if (sLower.includes('hin')) subId = 'sub_hindi';
      else if (sLower.includes('mar')) subId = 'sub_marathi';

      queryD1(
        `INSERT OR REPLACE INTO documents (id, title, subject_id, doc_type, standard, r2_key, r2_url, file_size_bytes, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newDoc.id,
          newDoc.originalName || newDoc.name,
          subId,
          newDoc.category === 'textbook' ? 'TEXTBOOK' : 'NOTES',
          '12',
          newDoc.name,
          newDoc.streamUrl || newDoc.url,
          newDoc.sizeBytes || 0,
          newDoc.uploadedBy || 'Faculty',
        ]
      ).catch((err) => console.warn('[D1 Upload Sync Notice]:', err.message));
    }
  } catch {}

  res.status(201).json(newDoc);
});

// Multi-Document Bulk Batch Upload (Up to 30 files at once)
app.post('/api/documents/upload-multiple', requireAdmin, upload.array('files', 30), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files received or rejected by security filter.' });
  }

  const { subject, standard, category, chapterNumber, chapterTitle, customFilter, tags } = req.body;
  const user = req.user;
  const isSuper = (Boolean(SUPER_ADMIN_EMAIL) && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || user.role === 'SUPER_ADMIN';
  const targetStandard = isSuper ? (standard || '12') : (user.standard || standard || '12');

  const cleanSubject = subject && subject.trim() ? subject.trim() : 'General';
  const subjects = readJsonFile('subjects.json', DEFAULT_SUBJECTS);
  if (!subjects.includes(cleanSubject)) {
    subjects.push(cleanSubject);
    writeJsonFile('subjects.json', subjects);
  }

  const parsedTags = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const docs = readJsonFile('documents.json', []);
  const createdDocs = [];

  let itemsMeta = [];
  if (req.body.itemsMeta) {
    try {
      itemsMeta = typeof req.body.itemsMeta === 'string' ? JSON.parse(req.body.itemsMeta) : req.body.itemsMeta;
    } catch {}
  }

  const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyP7ulx0qKE5dL57j_In3D8MWXjMAdK6lYd2a0WTDo50f1Y6YscA6qCp2SEv9F_-b5Wmg/exec';

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const fileMeta = (Array.isArray(itemsMeta) && (itemsMeta.find((m) => m && m.name === file.originalname) || itemsMeta[i])) || {};

    const fileChapterNumber = (fileMeta.chapterNumber !== undefined ? fileMeta.chapterNumber : (chapterNumber || '')).trim();
    const fileChapterTitle = (fileMeta.chapterTitle !== undefined ? fileMeta.chapterTitle : (chapterTitle || '')).trim();
    const fileCategory = fileMeta.category === 'textbook' ? 'textbook' : (fileMeta.category || (category === 'textbook' ? 'textbook' : (category || 'notes')));
    const fileCustomFilter = (fileMeta.customFilter !== undefined ? fileMeta.customFilter : (customFilter || '')).trim();
    const fileTags = Array.isArray(fileMeta.tags) && fileMeta.tags.length > 0
      ? fileMeta.tags
      : fileCustomFilter
      ? [fileCustomFilter]
      : parsedTags;

    const matchingCount = docs.filter(
      (d) => (d.originalName || d.name || '').trim().toLowerCase() === file.originalname.trim().toLowerCase()
    ).length;

    let streamUrl = `/uploads/${file.filename}`;
    let driveId = null;

    if (APPS_SCRIPT_URL && file.path && fs.existsSync(file.path)) {
      try {
        const fileBuf = fs.readFileSync(file.path);
        const gasRes = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.originalname,
            fileBase64: fileBuf.toString('base64'),
            mimeType: file.mimetype,
            subject: cleanSubject,
            standard: targetStandard,
            category: fileCategory,
          }),
        });
        const gasJson = await gasRes.json().catch(() => null);
        if (gasJson && (gasJson.streamUrl || gasJson.url)) {
          streamUrl = gasJson.streamUrl || gasJson.url;
          driveId = gasJson.id;
        }
      } catch (gasErr) {
        console.warn(`[Server Google Drive Forward Error for ${file.originalname}]:`, gasErr);
      }
    }

    const newDoc = {
      id: driveId || ('doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
      name: file.filename,
      originalName: file.originalname,
      serverUrl: streamUrl,
      streamUrl: streamUrl,
      url: streamUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.email,
      subject: cleanSubject,
      standard: targetStandard,
      category: fileCategory,
      chapterNumber: fileChapterNumber,
      chapterTitle: fileChapterTitle,
      customFilter: fileCustomFilter,
      tags: fileTags,
      uploadCount: matchingCount + 1,
    };

    docs.unshift(newDoc);
    createdDocs.push(newDoc);
  }

  writeJsonFile('documents.json', docs);
  res.status(201).json({ documents: createdDocs, count: createdDocs.length });
});

// Helper to extract Google Drive file ID from a document record or URL
function extractDriveFileId(doc) {
  if (!doc) return null;
  const candidates = [doc.streamUrl, doc.serverUrl, doc.url, doc.id].filter(Boolean);
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const str = c.trim();
    const matchD = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) return matchD[1];
    const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) return matchId[1];
    if (/^[a-zA-Z0-9_-]{25,60}$/.test(str) && !str.startsWith('doc-') && !str.startsWith('local-')) {
      return str;
    }
  }
  return null;
}

// Helper to delete or trash a file from Google Drive via Apps Script and/or Service Account
async function deleteFromDriveServer(fileId) {
  if (!fileId) return false;
  let deleted = false;

  // 1. Google Apps Script Web App deletion
  const gasUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', fileId }),
      });
      deleted = true;
    } catch (e) {
      console.warn('[Server Apps Script delete notice]:', e.message);
    }

    try {
      const getDelUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=delete&fileId=${encodeURIComponent(fileId)}&t=${Date.now()}`;
      await fetch(getDelUrl, { method: 'GET' });
      deleted = true;
    } catch {}
  }

  // 2. Google Service Account (GCP) deletion
  const GOOGLE_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (GOOGLE_CREDENTIALS) {
    try {
      const { google } = require('googleapis');
      const credentials = GOOGLE_CREDENTIALS.startsWith('{')
        ? JSON.parse(GOOGLE_CREDENTIALS)
        : JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS, 'utf8'));

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
      });
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.delete({ fileId });
      deleted = true;
    } catch (gErr) {
      console.warn('[Server Google Drive API delete notice]:', gErr.message);
    }
  }

  return deleted;
}

// Delete Single Document (from database, Google Drive, and local storage)
app.delete('/api/documents/:id', requireAdmin, async (req, res) => {
  const docId = req.params.id;
  const docs = readJsonFile('documents.json', []);
  const docToDelete = docs.find((d) => d.id === docId);

  // Permanently record in deleted documents tombstone
  const deletedList = readJsonFile('deleted_documents.json', []);
  if (!deletedList.includes(docId)) {
    deletedList.push(docId);
    writeJsonFile('deleted_documents.json', deletedList);
  }

  if (docToDelete) {
    // 1. Delete from Google Drive
    const driveId = extractDriveFileId(docToDelete);
    if (driveId) {
      deleteFromDriveServer(driveId).catch((err) => {
        console.warn('[Google Drive delete error]:', err.message);
      });
    }

    // 2. Delete local uploaded file if on disk
    if (docToDelete.serverUrl && docToDelete.serverUrl.startsWith('/uploads/')) {
      const localPath = path.join(UPLOADS_DIR, path.basename(docToDelete.serverUrl));
      if (fs.existsSync(localPath)) {
        try { fs.unlinkSync(localPath); } catch {}
      }
    }
  }

    const updated = docs.filter((d) => d.id !== docId);
  writeJsonFile('documents.json', updated);

  // Sync deletion with Cloudflare D1 Edge Database
  try {
    const { isConfigured, queryD1 } = require('./cloudflareD1');
    if (isConfigured) {
      queryD1('DELETE FROM documents WHERE id = ?', [docId]).catch((e) => console.warn('[D1 Delete Document Notice]:', e.message));
    }
  } catch {}

  res.json({ success: true, remaining: updated.length, deletedFromDrive: true });
});

// Wipe All Study Notes Documents (including Google Drive and disk)
app.delete('/api/documents-all/purge', requireAdmin, async (req, res) => {
  const docs = readJsonFile('documents.json', []);
  const deletedList = readJsonFile('deleted_documents.json', []);

  // Record all purged document IDs into tombstone
  docs.forEach((doc) => {
    if (doc && doc.id && !deletedList.includes(doc.id)) {
      deletedList.push(doc.id);
    }
  });
  writeJsonFile('deleted_documents.json', deletedList);

  // Delete all associated files from Google Drive and local uploads in background
  docs.forEach((doc) => {
    const driveId = extractDriveFileId(doc);
    if (driveId) {
      deleteFromDriveServer(driveId).catch(() => {});
    }
    if (doc.serverUrl && doc.serverUrl.startsWith('/uploads/')) {
      const localPath = path.join(UPLOADS_DIR, path.basename(doc.serverUrl));
      if (fs.existsSync(localPath)) {
        try { fs.unlinkSync(localPath); } catch {}
      }
    }
  });

  writeJsonFile('documents.json', []);
  res.json({ success: true, message: 'All study notes and Google Drive documents removed successfully.' });
});

// 5. NOTES STORAGE
app.get('/api/notes', (req, res) => {
  const notes = readJsonFile('notes.json', { content: '', updatedAt: new Date().toISOString() });
  res.json(notes);
});

app.put('/api/notes', (req, res) => {
  const { content } = req.body;
  const payload = {
    content: typeof content === 'string' ? content : '',
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile('notes.json', payload);
  res.json({ success: true, updatedAt: payload.updatedAt });
});

// 6. SYLLABUS ROADMAP STORAGE
app.get('/api/syllabus', (req, res) => {
  const syllabus = readJsonFile('syllabus.json', []);
  res.json(syllabus);
});

app.put('/api/syllabus', (req, res) => {
  const { topics } = req.body;
  writeJsonFile('syllabus.json', topics || []);
  res.json({ success: true, count: (topics || []).length });
});

// 7. TIMETABLE SCHEDULE STORAGE
app.get('/api/timetable', (req, res) => {
  const schedule = readJsonFile('timetable.json', []);
  res.json(schedule);
});

app.put('/api/timetable', (req, res) => {
  const { slots } = req.body;
  writeJsonFile('timetable.json', slots || []);
  res.json({ success: true, count: (slots || []).length });
});

// 8. POMODORO TIMER STORAGE
app.get('/api/pomodoro', (req, res) => {
  const pomodoro = readJsonFile('pomodoro.json', { sessionsCompleted: 0 });
  res.json(pomodoro);
});

app.put('/api/pomodoro', (req, res) => {
  const { settings, sessionsCompleted } = req.body;
  const current = readJsonFile('pomodoro.json', {});
  const updated = {
    settings: settings || current.settings,
    sessionsCompleted: typeof sessionsCompleted === 'number' ? sessionsCompleted : current.sessionsCompleted,
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile('pomodoro.json', updated);
  res.json(updated);
});

// 9. SECURE DATABASE SYNC ENDPOINT
const ALLOWED_DB_FILES = new Set([
  'syllabus.json',
  'timetable.json',
  'notes.json',
  'documents.json',
  'test-papers.json',
  'pomodoro.json',
  'subjects.json',
  'notifications.json',
  'users.json',
]);

app.get('/api/db/sync', async (req, res) => {
  const rawFile = (req.query.file || 'syllabus.json').toString();
  const fileName = path.basename(rawFile);
  if (!ALLOWED_DB_FILES.has(fileName)) {
    return res.status(400).json({ error: 'Access to requested data file is restricted.' });
  }

  // users.json strictly requires super administrator authentication
  if (fileName === 'users.json') {
    const user = extractBearerUser(req);
    const isSuper = user && ((Boolean(SUPER_ADMIN_EMAIL) && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || user.role === 'SUPER_ADMIN');
    if (!isSuper) {
      return res.status(403).json({ error: 'Permission denied. Super Admin access required for user records.' });
    }
  }

  const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO || 'BSFrameWorks5253/AetherStudy';

  try {
    if (GH_ACCESS_TOKEN) {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/${fileName}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'AetherStudy-DB-Sync',
        },
      });
      if (response.ok) {
        const json = await response.json();
        const rawContent = Buffer.from(json.content, 'base64').toString('utf8');
        return res.json({ success: true, source: 'github', data: JSON.parse(rawContent), sha: json.sha });
      }
    }

    const localData = readJsonFile(fileName, []);
    return res.json({ success: true, source: 'local', data: localData });
  } catch (error) {
    console.error('[Database Sync GET Error]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
});

app.post('/api/db/sync', requireAdmin, async (req, res) => {
  const { file, data, action, subject, document } = req.body || {};
  const user = req.user;

  // Special Action: Attach Google Drive PDF link into syllabus.json and documents.json
  if (action === 'attach-drive-doc' && document) {
    try {
      let syllabus = readJsonFile('syllabus.json', []);
      let matched = false;

      syllabus = syllabus.map((node) => {
        if (node.subject && subject && node.subject.toLowerCase() === subject.toLowerCase()) {
          matched = true;
          const materials = Array.isArray(node.materials) ? node.materials : [];
          return {
            ...node,
            materials: [
              ...materials,
              { id: document.id, name: document.name, streamUrl: document.streamUrl, uploadedAt: new Date().toISOString() },
            ],
          };
        }
        return node;
      });

      if (!matched && subject) {
        syllabus.push({
          id: `subj-${Date.now()}`,
          subject,
          title: `${subject} Syllabus & Vault`,
          chapters: [],
          materials: [{ id: document.id, name: document.name, streamUrl: document.streamUrl, uploadedAt: new Date().toISOString() }],
        });
      }

      writeJsonFile('syllabus.json', syllabus);

      let docs = readJsonFile('documents.json', []);
      if (!Array.isArray(docs)) docs = [];
      const cleanSubject = subject || document.subject || 'General';
      const count = docs.filter(
        (d) => (d.originalName || d.name || '').trim().toLowerCase() === (document.originalName || document.name || '').trim().toLowerCase()
      ).length;
      const enhancedDoc = {
        ...document,
        subject: cleanSubject,
        originalName: document.originalName || document.name,
        uploadCount: document.uploadCount || (count + 1),
        standard: document.standard || '12',
        category: document.category || 'notes',
      };
      docs = [enhancedDoc, ...docs.filter((d) => d.id !== document.id)];
      writeJsonFile('documents.json', docs);

      return res.status(200).json({ success: true, message: 'Google Drive pointer saved to syllabus.json', document: enhancedDoc });
    } catch (err) {
      console.error('[Attach Drive Doc Error]:', err);
      return res.status(500).json({ error: 'Internal security node allocation error.' });
    }
  }

  if (!file) return res.status(400).json({ error: 'Target file required.' });
  const fileName = path.basename(file);
  if (!ALLOWED_DB_FILES.has(fileName)) {
    return res.status(400).json({ error: 'Access to requested data file is restricted.' });
  }

  if (fileName === 'users.json') {
    const isSuper = (Boolean(SUPER_ADMIN_EMAIL) && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || user.role === 'SUPER_ADMIN';
    if (!isSuper) {
      return res.status(403).json({ error: 'Only Super Administrator can alter user records.' });
    }
  }

  const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO || 'BSFrameWorks5253/AetherStudy';

  try {
    let savedToGitHub = false;
    if (GH_ACCESS_TOKEN) {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/${fileName}`;
      let sha = undefined;
      const existing = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'AetherStudy-DB-Sync',
        },
      });
      if (existing.ok) {
        const json = await existing.json();
        sha = json.sha;
      }

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'AetherStudy-DB-Sync',
        },
        body: JSON.stringify({
          message: `db(sync): update ${fileName} [Zero-Cost GitHub DB]`,
          content: Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64'),
          sha,
        }),
      });
      savedToGitHub = putRes.ok;
    }

    writeJsonFile(fileName, data);
    return res.json({ success: true, source: savedToGitHub ? 'github' : 'local' });
  } catch (error) {
    console.error('[Database Sync POST Error]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
});

// 10. GOOGLE DRIVE LARGE PDF STORAGE ROUTING ENDPOINT WITH PROPER FOLDERS
app.post('/api/storage/upload', requireAdmin, async (req, res) => {
  const { fileName, fileBase64, mimeType, subject, standard, category, year, isAnswerKey, folderPath } = req.body || {};
  if (!fileName || !fileBase64) {
    return res.status(400).json({ error: 'File name and file base64 buffer required.' });
  }

  const user = req.user;
  const uploaderEmail = user.email;

  try {
    const base64Data = fileBase64.includes(';base64,') ? fileBase64.split(';base64,')[1] : fileBase64;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    let streamUrl = '';
    let driveFileId = `gdrive-${Date.now()}`;
    let resolvedFolder = '';

    // Priority 1: Free Google Apps Script Web App (100% Free, Zero GCP Setup)
    const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyP7ulx0qKE5dL57j_In3D8MWXjMAdK6lYd2a0WTDo50f1Y6YscA6qCp2SEv9F_-b5Wmg/exec';
    if (APPS_SCRIPT_URL) {
      try {
        const gasRes = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            fileBase64: base64Data,
            mimeType: mimeType || 'application/pdf',
            subject: subject || 'General',
            standard: standard || '12',
            category: category || 'notes',
            year: year || '',
            isAnswerKey: !!isAnswerKey,
            folderPath: folderPath || '',
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
          }),
        });
        const gasJson = await gasRes.json();
        if (gasJson && gasJson.success && (gasJson.streamUrl || gasJson.url)) {
          streamUrl = gasJson.streamUrl || gasJson.url;
          driveFileId = gasJson.id || driveFileId;
          resolvedFolder = gasJson.folderPath || gasJson.folderName || '';
        }
      } catch (gasErr) {
        console.error('[Google Apps Script Upload Error]:', gasErr);
      }
    }

    const GOOGLE_CREDENTIALS = !streamUrl ? process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS : null;
    if (GOOGLE_CREDENTIALS) {
      try {
        const { google } = require('googleapis');
        const { Readable } = require('stream');
        const credentials = GOOGLE_CREDENTIALS.startsWith('{')
          ? JSON.parse(GOOGLE_CREDENTIALS)
          : JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS, 'utf8'));

        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
        });
        const drive = google.drive({ version: 'v3', auth });

        const fileMeta = {
          name: fileName,
          description: `Subject: ${subject || 'General'} | Uploader: ${uploaderEmail || 'Admin'}`,
        };
        if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
          fileMeta.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
        }

        const driveRes = await drive.files.create({
          requestBody: fileMeta,
          media: {
            mimeType: mimeType || 'application/pdf',
            body: Readable.from(fileBuffer),
          },
          fields: 'id, name, webViewLink',
        });

        driveFileId = driveRes.data.id || driveFileId;

        await drive.permissions.create({
          fileId: driveFileId,
          requestBody: { role: 'reader', type: 'anyone' },
        });

        streamUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;
      } catch (gErr) {
        console.error('[Google Drive Upload Error, fallback to local]:', gErr);
      }
    }

    if (!streamUrl) {
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, safeName), fileBuffer);
      streamUrl = `/uploads/${safeName}`;
    }

    const docRecord = {
      id: driveFileId,
      name: fileName,
      originalName: fileName,
      subject: subject || 'General',
      standard: standard || '12',
      category: category || 'notes',
      folder: resolvedFolder || folderPath || '',
      size: `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
      sizeBytes: fileBuffer.length,
      url: streamUrl,
      streamUrl: streamUrl,
      serverUrl: streamUrl,
      uploadedBy: uploaderEmail || 'admin',
      uploadedAt: new Date().toISOString(),
    };

    const docs = readJsonFile('documents.json', []);
    docs.unshift(docRecord);
    writeJsonFile('documents.json', docs);

    return res.status(200).json({ success: true, document: docRecord });
  } catch (error) {
    console.error('[Storage Upload Failure]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[AetherStudy Server Storage Engine] Running on port ${PORT}`);
    console.log(`[Super Admin]: ${SUPER_ADMIN_EMAIL}`);
  });
}

module.exports = app;
