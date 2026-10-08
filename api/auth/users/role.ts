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
        message: 'auth: update user roles database',
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
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use PUT.' });
  }

  const { requesterEmail, targetEmail, newRole, standard } = req.body || {};

  if (!requesterEmail || requesterEmail.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: `Permission Denied: Only primary administrator (${SUPER_ADMIN_EMAIL}) can modify user roles.`,
    });
  }

  if (!targetEmail || !['ADMIN', 'USER'].includes(newRole)) {
    return res.status(400).json({ error: 'Valid target email and role (ADMIN or USER) required.' });
  }

  const normalizedTarget = targetEmail.trim().toLowerCase();
  if (normalizedTarget === SUPER_ADMIN_EMAIL) {
    return res.status(400).json({ error: 'Primary owner role cannot be modified.' });
  }

  const { users, sha } = await getUsers();
  const targetUser = users.find((u) => u.email.toLowerCase() === normalizedTarget);

  if (!targetUser) {
    // Add user with the specified role if not found yet
    const newUser = {
      email: normalizedTarget,
      role: newRole,
      standard: standard || '12',
      lastLogin: new Date().toISOString(),
    };
    users.push(newUser);
    await saveUsers(users, sha);
    return res.status(200).json({ success: true, updatedUser: newUser });
  }

  targetUser.role = newRole;
  if (standard) targetUser.standard = standard;
  await saveUsers(users, sha);
  return res.status(200).json({ success: true, updatedUser: targetUser });
}
