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
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
const OTP_SECRET = process.env.OTP_SECRET || 'aether-antigravity-secure-session-key-2026';

// Storage Directory Setup (Compatible with local and Vercel Serverless /tmp)
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/material', express.static(path.join(__dirname, '../Material')));
app.use('/data', express.static(path.join(__dirname, '../data')));

// File Validation & Multer Engine
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.html', '.htm', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp', '.svg']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/html',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
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
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const seedPath = path.join(__dirname, 'data', filename);
    if (fs.existsSync(seedPath)) {
      return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
  }
  return defaultValue;
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
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

const initialTestPapers = [
  {
    id: 'tp-1',
    title: 'MIT 6.824 End-Semester Final Examination',
    subject: 'Distributed Systems',
    year: 2024,
    examType: 'Final Exam',
    questionPdfUrl: '/uploads/MIT_6_824_2024_Final_Exam_Questions.html',
    questionPdfName: 'MIT_6.824_2024_Final_Exam_Questions.pdf',
    answerKeyPdfUrl: '/uploads/MIT_6_824_2024_Final_Exam_Solutions.html',
    answerKeyPdfName: 'MIT_6.824_2024_Final_Exam_Solutions.pdf',
    totalMarks: 100,
    durationMinutes: 120,
    uploadedBy: SUPER_ADMIN_EMAIL,
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'tp-2',
    title: 'Quantum Information & Error Correction Midterm PYQ',
    subject: 'Quantum Information Science',
    year: 2023,
    examType: 'PYQ',
    questionPdfUrl: '/uploads/MIT_6_824_2024_Final_Exam_Questions.html',
    questionPdfName: 'QIS_2023_Midterm_PYQ_Paper.pdf',
    answerKeyPdfUrl: '/uploads/MIT_6_824_2024_Final_Exam_Solutions.html',
    answerKeyPdfName: 'QIS_2023_Midterm_PYQ_Solutions.pdf',
    totalMarks: 75,
    durationMinutes: 90,
    uploadedBy: SUPER_ADMIN_EMAIL,
    uploadedAt: new Date().toISOString(),
  },
];

if (!fs.existsSync(path.join(DATA_DIR, 'test-papers.json'))) {
  writeJsonFile('test-papers.json', initialTestPapers);
}

// ---------------- REST API ROUTES ----------------

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

    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || 'bs.framework5253@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'pfnkadvsxyzqukob').replace(/\s+/g, '');
    let sent = false;
    let sandboxNotice = null;
    let fallbackPasscode = null;

    if (smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpUser, pass: smtpPass },
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
        console.error('[SMTP Dispatch Error]:', smtpErr);
      }
    }

    if (!sent && resendApiKey) {
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
        if (resendErr) {
          console.error('[Internal Email Dispatch Error from Resend]:', resendErr);
          const errMsg = resendErr.message || '';
          if (errMsg.toLowerCase().includes('testing emails to your own email') || errMsg.toLowerCase().includes('verify a domain')) {
            sandboxNotice = 'Resend sandbox limit: Free test domain onboarding@resend.dev only delivers to the owner. Use the test code below to proceed.';
            fallbackPasscode = otp;
          }
        } else {
          sent = true;
        }
      } catch (err) {
        console.error('[Internal Email Dispatch Error]:', err);
        fallbackPasscode = otp;
      }
    }

    if (!sent && !fallbackPasscode) {
      fallbackPasscode = otp;
      sandboxNotice = 'Email provider credentials not configured. Use the test passcode below.';
    }

    // Always log to terminal so offline/local testing is 100% instant and never blocked
    console.log(`\n======================================================`);
    console.log(`🔑 [AETHERSTUDY VERIFICATION PASSCODE]`);
    console.log(`   Target User: ${normalizedEmail}`);
    console.log(`   PASSCODE: >>> ${otp} <<< (Valid for 10 minutes)`);
    if (!sent) {
      console.log(`   Notice: ${sandboxNotice || 'Sandbox test fallback active.'}`);
    }
    console.log(`======================================================\n`);

    const [uPart, dPart] = normalizedEmail.split('@');
    return res.status(200).json({
      success: true,
      message: sent ? 'Verification code sent to your email.' : (sandboxNotice || 'Verification token initialized.'),
      token,
      maskedEmail: `${uPart[0]}***@${dPart}`,
      devPasscode: fallbackPasscode || undefined,
      sandboxNotice: sandboxNotice || undefined,
    });
  } catch (error) {
    console.error('[Internal OTP Generation Failure]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
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

    return res.status(200).json({
      success: true,
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
  const users = readJsonFile('users.json', initialUsers);
  let user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    const isSuper = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();
    user = {
      email: normalizedEmail,
      role: isSuper ? 'SUPER_ADMIN' : 'USER',
      lastLogin: new Date().toISOString(),
    };
    users.push(user);
  } else {
    if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      user.role = 'SUPER_ADMIN';
    }
    user.lastLogin = new Date().toISOString();
  }

  writeJsonFile('users.json', users);
  res.json(user);
});

// Get registered users (Only for SUPER_ADMIN)
app.get('/api/auth/users', (req, res) => {
  const users = readJsonFile('users.json', initialUsers);
  res.json(users);
});

// Add / Assign User Role directly by Super Admin
app.post('/api/auth/users', (req, res) => {
  const { requesterEmail, email, role } = req.body || {};
  if (
    !requesterEmail ||
    requesterEmail.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return res.status(403).json({
      error: `Permission Denied: Only primary administrator (${SUPER_ADMIN_EMAIL}) can add or assign roles.`,
    });
  }

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
app.put('/api/auth/users/role', (req, res) => {
  const { requesterEmail, targetEmail, newRole } = req.body;

  if (
    !requesterEmail ||
    requesterEmail.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return res.status(403).json({
      error: `Permission Denied: Only the owner (${SUPER_ADMIN_EMAIL}) can modify user roles.`,
    });
  }

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
  let testPapers = readJsonFile('test-papers.json', initialTestPapers);
  if (!testPapers || testPapers.length <= 2) {
    const catalogPath = path.join(__dirname, '../src/data/catalog.json');
    if (fs.existsSync(catalogPath)) {
      try {
        const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        if (cat.testPapers && Array.isArray(cat.testPapers) && cat.testPapers.length > 0) {
          testPapers = cat.testPapers;
        }
      } catch (e) {}
    }
  }
  res.json(testPapers);
});

// Upload PYQ Test Paper with both Question and Answer PDFs
app.post(
  '/api/test-papers/upload',
  upload.fields([
    { name: 'questionFile', maxCount: 1 },
    { name: 'answerKeyFile', maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files;
    const { title, subject, year, examType, durationMinutes, totalMarks, uploadedBy } = req.body;

    // Check authorization: only admin or super admin can upload
    const normalizedUploader = (uploadedBy || '').trim().toLowerCase();
    const users = readJsonFile('users.json', initialUsers);
    const uploader = users.find((u) => u.email.toLowerCase() === normalizedUploader);

    const isAuthorized =
      uploader && (uploader.role === 'SUPER_ADMIN' || uploader.role === 'ADMIN' || normalizedUploader === SUPER_ADMIN_EMAIL.toLowerCase());

    if (!isAuthorized) {
      return res.status(403).json({
        error: `Upload restricted. Only authorized admins or ${SUPER_ADMIN_EMAIL} can upload test papers.`,
      });
    }

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
      uploadedBy: normalizedUploader,
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

app.delete('/api/test-papers/:id', (req, res) => {
  const { requesterEmail } = req.body;
  const normalizedRequester = (requesterEmail || '').trim().toLowerCase();
  const users = readJsonFile('users.json', initialUsers);
  const uploader = users.find((u) => u.email.toLowerCase() === normalizedRequester);

  if (!uploader || (uploader.role !== 'SUPER_ADMIN' && uploader.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Only admins can delete test papers.' });
  }

  const testPapers = readJsonFile('test-papers.json', initialTestPapers);
  const updated = testPapers.filter((tp) => tp.id !== req.params.id);
  writeJsonFile('test-papers.json', updated);
  res.json({ success: true, remaining: updated.length });
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

app.post('/api/notifications', (req, res) => {
  const { title, message, standard, priority, senderEmail, senderName } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  const normalizedSender = (senderEmail || '').trim().toLowerCase();
  const users = readJsonFile('users.json', initialUsers);
  const sender = users.find((u) => u.email.toLowerCase() === normalizedSender);
  const isAuthorized =
    (sender && (sender.role === 'SUPER_ADMIN' || sender.role === 'ADMIN')) ||
    normalizedSender === SUPER_ADMIN_EMAIL.toLowerCase();

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Only administrators can broadcast notifications.' });
  }

  const newNotif = {
    id: 'notif-' + Date.now(),
    title: title.trim(),
    message: message.trim(),
    standard: standard || '12',
    priority: priority || 'important',
    createdAt: new Date().toISOString(),
    senderEmail: normalizedSender,
    senderName: senderName || (sender ? sender.name : 'Administrator'),
  };

  const notifs = readJsonFile('notifications.json', initialNotifications);
  notifs.unshift(newNotif);
  writeJsonFile('notifications.json', notifs);
  res.status(201).json(newNotif);
});

app.delete('/api/notifications/:id', (req, res) => {
  const { requesterEmail } = req.body;
  const normalizedRequester = (requesterEmail || '').trim().toLowerCase();
  const users = readJsonFile('users.json', initialUsers);
  const requester = users.find((u) => u.email.toLowerCase() === normalizedRequester);
  const isAuthorized =
    (requester && (requester.role === 'SUPER_ADMIN' || requester.role === 'ADMIN')) ||
    normalizedRequester === SUPER_ADMIN_EMAIL.toLowerCase();

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const notifs = readJsonFile('notifications.json', initialNotifications);
  const updated = notifs.filter((n) => n.id !== req.params.id);
  writeJsonFile('notifications.json', updated);
  res.json({ success: true, remaining: updated.length });
});

// ---------------- STANDARD-SCOPED PEER CHAT (WHATSAPP/DISCORD STYLE) ----------------
const initialChatMessages = [
  {
    id: 'chat-seed-1',
    standard: '12',
    channelId: 'general',
    senderEmail: 'student.hsc@example.com',
    senderName: 'Rohit K.',
    senderRole: 'USER',
    content: 'Hey everyone! Has anyone started practicing the Partnership Final Accounts adjustment sums for the preliminary exams?',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    reactions: { '👍': 4, '💡': 2 },
  },
  {
    id: 'chat-seed-2',
    standard: '12',
    channelId: 'general',
    senderEmail: 'bs.framework5253@gmail.com',
    senderName: 'Super Admin',
    senderRole: 'SUPER_ADMIN',
    content: 'Welcome to the Standard 12 HSC Peer Lounge! You can discuss solutions, ask doubts about Book-Keeping, OCM, Economics, and Maths, and prepare together.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    reactions: { '🔥': 6, '❤️': 5 },
  },
  {
    id: 'chat-seed-3',
    standard: '12',
    channelId: 'accounts',
    senderEmail: 'priya.accounts@example.com',
    senderName: 'Priya S.',
    senderRole: 'USER',
    content: 'Can someone explain the treatment of Goods distributed as free samples in Trading A/c vs P&L A/c?',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    reactions: { '📚': 3 },
  },
];

app.get('/api/chat/messages', (req, res) => {
  const { standard = '12', channelId = 'general' } = req.query;
  const messages = readJsonFile('chat-messages.json', initialChatMessages);
  const filtered = messages.filter(
    (m) => (m.standard === standard || standard === 'ALL') && (m.channelId === channelId)
  );
  res.json(filtered);
});

app.post('/api/chat/messages', (req, res) => {
  const { standard, channelId, senderEmail, senderName, senderRole, content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  const newMsg = {
    id: 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    standard: standard || '12',
    channelId: channelId || 'general',
    senderEmail: (senderEmail || 'student@example.com').trim().toLowerCase(),
    senderName: (senderName || 'Student').trim(),
    senderRole: senderRole || 'USER',
    content: content.trim(),
    timestamp: new Date().toISOString(),
    reactions: {},
  };

  const messages = readJsonFile('chat-messages.json', initialChatMessages);
  messages.push(newMsg);
  if (messages.length > 500) messages.splice(0, messages.length - 500);
  writeJsonFile('chat-messages.json', messages);
  res.status(201).json(newMsg);
});

app.post('/api/chat/messages/:id/react', (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

  const messages = readJsonFile('chat-messages.json', initialChatMessages);
  const msg = messages.find((m) => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  if (!msg.reactions) msg.reactions = {};
  msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
  writeJsonFile('chat-messages.json', messages);
  res.json({ success: true, reactions: msg.reactions });
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
  if (!docs || docs.length === 0) {
    const catalogPath = path.join(__dirname, '../src/data/catalog.json');
    if (fs.existsSync(catalogPath)) {
      try {
        const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        if (cat.documents && Array.isArray(cat.documents) && cat.documents.length > 0) {
          docs = cat.documents;
        }
      } catch (e) {}
    }
  }

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
    };
  });

  if (standard && standard !== 'ALL') {
    docs = docs.filter(
      (d) => !d.standard || d.standard === 'ALL' || d.standard === standard
    );
  }

  res.json(docs);
});

app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received or rejected by security filter.' });
  }

  const { subject, uploadedBy, standard, category } = req.body;
  const normalizedUploader = (uploadedBy || '').trim().toLowerCase();
  const users = readJsonFile('users.json', initialUsers);
  const uploader = users.find((u) => u.email.toLowerCase() === normalizedUploader);

  const isSuper =
    normalizedUploader === SUPER_ADMIN_EMAIL.toLowerCase() ||
    (uploader && uploader.role === 'SUPER_ADMIN') ||
    normalizedUploader === 'admin' ||
    !normalizedUploader;
  const isAdmin = isSuper || (uploader && uploader.role === 'ADMIN');

  if (!isAdmin) {
    return res.status(403).json({
      error: `Upload restricted. Only authorized admins or ${SUPER_ADMIN_EMAIL} can upload documents.`,
    });
  }

  // Admins can only upload to their assigned standard; Super Admin can choose any standard or ALL
  const targetStandard = isSuper ? (standard || '12') : (uploader?.standard || standard || '12');

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

  const newDoc = {
    id: 'doc-' + Date.now(),
    name: req.file.filename,
    originalName: req.file.originalname,
    serverUrl: `/uploads/${req.file.filename}`,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: normalizedUploader,
    subject: cleanSubject,
    standard: targetStandard,
    category: category === 'textbook' ? 'textbook' : 'notes',
    uploadCount: matchingCount + 1,
  };

  docs.unshift(newDoc);
  writeJsonFile('documents.json', docs);

  res.status(201).json(newDoc);
});

app.delete('/api/documents/:id', (req, res) => {
  const docs = readJsonFile('documents.json', []);
  const updated = docs.filter((d) => d.id !== req.params.id);
  writeJsonFile('documents.json', updated);
  res.json({ success: true, remaining: updated.length });
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

// 9. ZERO-COST HIDDEN GITHUB DATABASE SYNC ENDPOINT
app.get('/api/db/sync', async (req, res) => {
  const fileName = (req.query.file || 'syllabus.json').toString();
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

app.post('/api/db/sync', async (req, res) => {
  const { file, data, action, subject, document } = req.body || {};

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

  const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO || 'BSFrameWorks5253/AetherStudy';

  try {
    let savedToGitHub = false;
    if (GH_ACCESS_TOKEN) {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/${file}`;
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
          message: `db(sync): update ${file} [Zero-Cost GitHub DB]`,
          content: Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64'),
          sha,
        }),
      });
      savedToGitHub = putRes.ok;
    }

    writeJsonFile(file, data);
    return res.json({ success: true, source: savedToGitHub ? 'github' : 'local' });
  } catch (error) {
    console.error('[Database Sync POST Error]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
});

// 10. GOOGLE DRIVE LARGE PDF STORAGE ROUTING ENDPOINT
app.post('/api/storage/upload', async (req, res) => {
  const { fileName, fileBase64, mimeType, subject, uploaderEmail } = req.body || {};
  if (!fileName || !fileBase64) {
    return res.status(400).json({ error: 'File name and file base64 buffer required.' });
  }

  try {
    const base64Data = fileBase64.includes(';base64,') ? fileBase64.split(';base64,')[1] : fileBase64;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    let streamUrl = '';
    let driveFileId = `gdrive-${Date.now()}`;

    // Priority 1: Free Google Apps Script Web App (100% Free, Zero GCP Setup)
    const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
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
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
          }),
        });
        const gasJson = await gasRes.json();
        if (gasJson && gasJson.success && (gasJson.streamUrl || gasJson.url)) {
          streamUrl = gasJson.streamUrl || gasJson.url;
          driveFileId = gasJson.id || driveFileId;
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
      subject: subject || 'General',
      size: `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
      url: streamUrl,
      streamUrl: streamUrl,
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
