import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

interface SyncPayload {
  file: string; // e.g. 'syllabus.json', 'notes.json', 'timetable.json', 'documents.json'
  data?: any;
}

const GITHUB_REPO = process.env.GITHUB_REPO || 'BSFrameWorks5253/AetherStudy';
const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;

// Local fallback directory for offline development
const LOCAL_DATA_DIR = path.join(process.cwd(), 'server', 'data');

async function fetchFromGitHub(fileName: string) {
  if (!GH_ACCESS_TOKEN) return null;

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/${fileName}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AetherStudy-DB-Sync',
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);

  const json = (await response.json()) as { content: string; sha: string };
  const rawContent = Buffer.from(json.content, 'base64').toString('utf8');
  return {
    data: JSON.parse(rawContent),
    sha: json.sha,
  };
}

async function writeToGitHub(fileName: string, data: any, existingSha?: string) {
  if (!GH_ACCESS_TOKEN) return false;

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/${fileName}`;
  const contentBase64 = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');

  const body: any = {
    message: `db(sync): update ${fileName} [AetherStudy Zero-Cost Pipeline]`,
    content: contentBase64,
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AetherStudy-DB-Sync',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`GitHub DB write failed: ${response.statusText}`);
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method;

  // 1. GET: Fetch JSON file from GitHub Database (or local fallback)
  if (method === 'GET') {
    const fileName = (req.query.file as string) || 'syllabus.json';

    // Whitelist allowed database collections
    const allowedFiles = new Set(['syllabus.json', 'notes.json', 'timetable.json', 'test-papers.json', 'documents.json', 'users.json']);
    if (!allowedFiles.has(fileName)) {
      return res.status(400).json({ error: 'Invalid database collection target.' });
    }

    try {
      // Primary: GitHub Database
      if (GH_ACCESS_TOKEN) {
        const ghResult = await fetchFromGitHub(fileName);
        if (ghResult) {
          return res.status(200).json({ success: true, source: 'github', data: ghResult.data, sha: ghResult.sha });
        }
      }

      // Local fallback if token not present or file not yet on GitHub
      const localPath = path.join(LOCAL_DATA_DIR, fileName);
      if (fs.existsSync(localPath)) {
        const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        return res.status(200).json({ success: true, source: 'local', data: localData });
      }

      return res.status(200).json({ success: true, source: 'empty', data: [] });
    } catch (error) {
      console.error('[GitHub Database Sync GET Error]:', error);
      return res.status(500).json({ error: 'Internal security node allocation error.' });
    }
  }

  // 2. POST / PUT: Write JSON document into GitHub Database
  if (method === 'POST' || method === 'PUT') {
    const { file, data } = (req.body as SyncPayload) || {};

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'Target database file collection identifier required.' });
    }

    const allowedFiles = new Set(['syllabus.json', 'notes.json', 'timetable.json', 'test-papers.json', 'documents.json', 'users.json']);
    if (!allowedFiles.has(file)) {
      return res.status(400).json({ error: 'Invalid database collection target.' });
    }

    try {
      let writtenToGitHub = false;

      if (GH_ACCESS_TOKEN) {
        // Fetch current SHA to update atomically
        const existing = await fetchFromGitHub(file);
        await writeToGitHub(file, data, existing?.sha);
        writtenToGitHub = true;
      } else {
        // Offline development write
        if (!fs.existsSync(LOCAL_DATA_DIR)) {
          fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(LOCAL_DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
      }

      return res.status(200).json({
        success: true,
        message: writtenToGitHub ? 'Database synced to GitHub.' : 'Database written locally.',
        file,
      });
    } catch (error) {
      console.error('[GitHub Database Sync POST Error]:', error);
      return res.status(500).json({ error: 'Internal security node allocation error.' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed.' });
}
