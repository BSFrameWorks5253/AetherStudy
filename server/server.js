require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
const SUPER_ADMIN_EMAIL = 'sounasathburhan5252@gmail.com';

// Storage Directory Setup
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

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
  'Distributed Systems',
  'Quantum Information Science',
  'Machine Learning Theory',
  'Computer Systems & OS',
  'Mathematics & Linear Algebra',
];

if (!fs.existsSync(path.join(DATA_DIR, 'subjects.json'))) {
  writeJsonFile('subjects.json', DEFAULT_SUBJECTS);
}

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

// 1. AUTHENTICATION & RBAC (Passwordless Email Sign-In)
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const users = readJsonFile('users.json', initialUsers);
  let user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    // New user registration
    const isSuper = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();
    user = {
      email: normalizedEmail,
      role: isSuper ? 'SUPER_ADMIN' : 'USER',
      lastLogin: new Date().toISOString(),
    };
    users.push(user);
  } else {
    // Existing user: ensure super admin role invariant
    if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      user.role = 'SUPER_ADMIN';
    }
    user.lastLogin = new Date().toISOString();
  }

  writeJsonFile('users.json', users);
  res.json(user);
});

// Get registered users (Only for SUPER_ADMIN sounasathburhan5252@gmail.com)
app.get('/api/auth/users', (req, res) => {
  const users = readJsonFile('users.json', initialUsers);
  res.json(users);
});

// Update User Role (Only permitted by sounasathburhan5252@gmail.com)
app.put('/api/auth/users/role', (req, res) => {
  const { requesterEmail, targetEmail, newRole } = req.body;

  if (
    !requesterEmail ||
    requesterEmail.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return res.status(403).json({
      error: 'Permission Denied: Only the owner (sounasathburhan5252@gmail.com) can modify user roles.',
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
  const testPapers = readJsonFile('test-papers.json', initialTestPapers);
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

// 3. SUBJECTS MANAGEMENT API
app.get('/api/subjects', (req, res) => {
  const subjects = readJsonFile('subjects.json', DEFAULT_SUBJECTS);
  res.json(subjects);
});

app.post('/api/subjects', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Valid subject name is required' });
  }

  const cleanName = name.trim();
  const subjects = readJsonFile('subjects.json', DEFAULT_SUBJECTS);
  if (!subjects.includes(cleanName)) {
    subjects.push(cleanName);
    writeJsonFile('subjects.json', subjects);
  }
  res.status(201).json({ subjects, created: cleanName });
});

// 4. DOCUMENTS & PDF UPLOADS
app.get('/api/documents', (req, res) => {
  const docs = readJsonFile('documents.json', []);
  res.json(docs);
});

app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received or rejected by security filter.' });
  }

  const { subject, uploadedBy } = req.body;
  const normalizedUploader = (uploadedBy || '').trim().toLowerCase();
  const users = readJsonFile('users.json', initialUsers);
  const uploader = users.find((u) => u.email.toLowerCase() === normalizedUploader);

  const isAuthorized =
    uploader && (uploader.role === 'SUPER_ADMIN' || uploader.role === 'ADMIN' || normalizedUploader === SUPER_ADMIN_EMAIL.toLowerCase());

  if (!isAuthorized) {
    return res.status(403).json({
      error: `Upload restricted. Only authorized admins or ${SUPER_ADMIN_EMAIL} can upload documents.`,
    });
  }

  const cleanSubject = subject && subject.trim() ? subject.trim() : 'General';
  const subjects = readJsonFile('subjects.json', DEFAULT_SUBJECTS);
  if (!subjects.includes(cleanSubject)) {
    subjects.push(cleanSubject);
    writeJsonFile('subjects.json', subjects);
  }

  const newDoc = {
    id: 'doc-' + Date.now(),
    name: req.file.filename,
    originalName: req.file.originalname,
    serverUrl: `/uploads/${req.file.filename}`,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    uploadedAt: new Date().toISOString(),
    subject: cleanSubject,
  };

  const docs = readJsonFile('documents.json', []);
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

app.listen(PORT, () => {
  console.log(`[AetherStudy Server Storage Engine] Running on port ${PORT}`);
  console.log(`[Super Admin]: ${SUPER_ADMIN_EMAIL}`);
});
