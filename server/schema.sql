-- ==============================================================================
-- AETHERSTUDY ENTERPRISE DATABASE SCHEMA (CLOUDFLARE D1 / SQLITE COMPLIANT)
-- Target: Maharashtra State Board HSC Class 12 Commerce Workstation
-- Integrated with Cloudflare R2 for Zero-Egress 10 GB PDF Object Storage
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- 1. USERS & ACCESS CONTROL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'STUDENT')) NOT NULL DEFAULT 'STUDENT',
  standard TEXT NOT NULL DEFAULT '12',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ------------------------------------------------------------------------------
-- 2. ACADEMIC STRUCTURE (HSC CLASS 12 COMMERCE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                 -- e.g. 'BK', 'OCM', 'ECO', 'MATHS', 'IT', 'SP', 'ENG'
  name TEXT NOT NULL,                        -- e.g. 'Book-Keeping & Accountancy'
  short_name TEXT NOT NULL,                  -- e.g. 'Accounts'
  category TEXT CHECK(category IN ('CORE_COMMERCE', 'MATHS_IT', 'LANGUAGES_SP')) NOT NULL,
  icon TEXT,
  accent_color TEXT DEFAULT '#3b82f6',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subjects_category ON subjects(category);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  marks_weightage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);

-- ------------------------------------------------------------------------------
-- 3. STUDY MATERIALS & TEXTBOOKS (CLOUDFLARE R2 INTEGRATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  doc_type TEXT CHECK(doc_type IN ('TEXTBOOK', 'NOTES', 'FORMULA_SHEET', 'MINDMAP')) NOT NULL DEFAULT 'NOTES',
  standard TEXT NOT NULL DEFAULT '12',
  r2_key TEXT NOT NULL,                      -- Storage key in Cloudflare R2 bucket
  r2_url TEXT NOT NULL,                      -- Public CDN URL from Cloudflare R2
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes INTEGER DEFAULT 0,
  page_count INTEGER DEFAULT 0,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_verified INTEGER DEFAULT 1,             -- 1 = approved, 0 = pending review
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_chapter ON documents(chapter_id);

-- ------------------------------------------------------------------------------
-- 4. BOARD PAPERS & MODEL SOLUTIONS (HSC COMMERCE PYQ VAULT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_papers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,                       -- e.g. 'HSC Accounts Board Exam March 2024'
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  exam_year INTEGER NOT NULL,                -- e.g. 2024, 2023, 2022
  exam_session TEXT CHECK(exam_session IN ('FEBRUARY_MARCH', 'JULY_AUGUST', 'PRE_BOARD', 'MODEL')) DEFAULT 'FEBRUARY_MARCH',
  exam_type TEXT CHECK(exam_type IN ('PYQ', 'MIDTERM', 'FINAL_EXAM', 'MOCK')) DEFAULT 'PYQ',
  duration_minutes INTEGER DEFAULT 180,
  total_marks INTEGER DEFAULT 80,
  
  -- Question Paper PDF in Cloudflare R2
  question_r2_key TEXT NOT NULL,
  question_r2_url TEXT NOT NULL,
  question_file_size_bytes INTEGER DEFAULT 0,
  
  -- Model Answer Key PDF in Cloudflare R2
  answer_r2_key TEXT,
  answer_r2_url TEXT,
  answer_file_size_bytes INTEGER DEFAULT 0,
  
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_papers_subject ON test_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_papers_year ON test_papers(exam_year);

-- ------------------------------------------------------------------------------
-- 5. STUDENT ENGAGEMENT, BOOKMARKS & PROGRESS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_chapter_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  is_completed INTEGER DEFAULT 0,
  confidence_rating INTEGER CHECK(confidence_rating BETWEEN 1 AND 5),
  personal_notes TEXT,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  title TEXT,
  color_tag TEXT DEFAULT '#f59e0b',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  session_type TEXT CHECK(session_type IN ('WORK', 'SHORT_BREAK', 'LONG_BREAK')) DEFAULT 'WORK',
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pomodoro_user ON pomodoro_sessions(user_id);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week TEXT CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')) NOT NULL,
  start_time TEXT NOT NULL,                 -- e.g. '09:00'
  end_time TEXT NOT NULL,                   -- e.g. '10:30'
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic TEXT,
  color_code TEXT DEFAULT '#3b82f6',
  is_completed INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timetable_user_day ON timetable_slots(user_id, day_of_week);

-- ------------------------------------------------------------------------------
-- 6. NOTIFICATIONS & COMMUNITY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('URGENT', 'IMPORTANT', 'INFO')) DEFAULT 'INFO',
  target_standard TEXT DEFAULT '12',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paper_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  exam_year INTEGER,
  notes TEXT,
  status TEXT CHECK(status IN ('PENDING', 'FULFILLED', 'REJECTED')) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. INITIAL SEED DATA FOR CLASS 12 COMMERCE
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO subjects (id, code, name, short_name, category, icon, accent_color, display_order) VALUES
('sub_bk', 'BK', 'Book-Keeping & Accountancy', 'Accounts', 'CORE_COMMERCE', 'BookOpen', '#3b82f6', 1),
('sub_ocm', 'OCM', 'Organization of Commerce & Management', 'OCM', 'CORE_COMMERCE', 'Building2', '#8b5cf6', 2),
('sub_eco', 'ECO', 'Economics', 'Economics', 'CORE_COMMERCE', 'TrendingUp', '#10b981', 3),
('sub_maths', 'MATHS', 'Mathematics & Statistics (Commerce)', 'Maths', 'MATHS_IT', 'Calculator', '#f59e0b', 4),
('sub_it', 'IT', 'Information Technology', 'IT', 'MATHS_IT', 'Binary', '#06b6d4', 5),
('sub_sp', 'SP', 'Secretarial Practice', 'SP', 'LANGUAGES_SP', 'FileText', '#ec4899', 6),
('sub_eng', 'ENG', 'English (Yuvakbharati)', 'English', 'LANGUAGES_SP', 'Languages', '#6366f1', 7),
('sub_hindi', 'HINDI', 'Hindi (Yuvakbharati)', 'Hindi', 'LANGUAGES_SP', 'Languages', '#f97316', 8),
('sub_marathi', 'MARATHI', 'Marathi (Yuvakbharati)', 'Marathi', 'LANGUAGES_SP', 'Languages', '#14b8a6', 9);
