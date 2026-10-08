import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const GITHUB_REPO = process.env.GITHUB_REPO || 'BSFrameWorks5253/AetherStudy';
const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'bs.framework5253@gmail.com').trim().toLowerCase();
const LOCAL_DATA_DIR = path.join(process.cwd(), 'server', 'data');

async function getUsers(): Promise<{ users: any[]; sha?: string }> {
  if (GH_ACCESS_TOKEN) {
    try {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/users.json`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'AetherStudy-Auth',
        },
      });
      if (res.ok) {
        const json = (await res.json()) as { content: string; sha: string };
        const raw = Buffer.from(json.content, 'base64').toString('utf8');
        return { users: JSON.parse(raw), sha: json.sha };
      }
    } catch (e) {
      console.warn('GitHub fetch users fallback', e);
    }
  }

  const localFile = path.join(LOCAL_DATA_DIR, 'users.json');
  if (fs.existsSync(localFile)) {
    try {
      return { users: JSON.parse(fs.readFileSync(localFile, 'utf8')) };
    } catch {}
  }

  return {
    users: [
      { email: SUPER_ADMIN_EMAIL, role: 'SUPER_ADMIN', lastLogin: new Date().toISOString() },
    ],
  };
}

async function saveUsers(users: any[], sha?: string): Promise<boolean> {
  if (GH_ACCESS_TOKEN) {
    try {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/users.json`;
      const content = Buffer.from(JSON.stringify(users, null, 2), 'utf8').toString('base64');
      const body: any = {
        message: 'auth: update users database',
        content,
      };
      if (sha) body.sha = sha;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'AetherStudy-Auth',
        },
        body: JSON.stringify(body),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('GitHub save users failed', e);
    }
  }

  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_DATA_DIR, 'users.json'), JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Local save users failed', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { users } = await getUsers();
    return res.status(200).json(users);
  }

  // POST: Add new admin or student directly
  if (req.method === 'POST') {
    const { requesterEmail, email, role, standard } = req.body || {};
    if (!requesterEmail || requesterEmail.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: `Only primary administrator (${SUPER_ADMIN_EMAIL}) can manage roles.` });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required.' });
    }

    const targetEmail = email.trim().toLowerCase();
    const targetRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    const { users, sha } = await getUsers();
    const existingIndex = users.findIndex((u) => u.email.toLowerCase() === targetEmail);

    if (existingIndex >= 0) {
      if (users[existingIndex].email.toLowerCase() === SUPER_ADMIN_EMAIL) {
        return res.status(400).json({ error: 'Primary owner role cannot be altered.' });
      }
      users[existingIndex].role = targetRole;
      if (standard) users[existingIndex].standard = standard;
    } else {
      users.push({
        email: targetEmail,
        role: targetRole,
        standard: standard || '12',
        lastLogin: new Date().toISOString(),
      });
    }

    await saveUsers(users, sha);
    return res.status(200).json({ success: true, users });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
