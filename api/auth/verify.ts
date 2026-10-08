import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';

const OTP_SECRET =
  process.env.OTP_SECRET ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  'aether-antigravity-secure-session-key-2026';

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Strictly enforce POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { email, otp, token, standard } = req.body || {};

  if (!email || !otp || !token) {
    return res.status(400).json({ error: 'Email, verification code, and validation token are all required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const submittedOtp = otp.toString().trim();

  try {
    const [expiresAtStr, expectedHash] = token.split('.');

    if (!expiresAtStr || !expectedHash) {
      return res.status(400).json({ error: 'Malformed verification token.' });
    }

    const expiresAt = Number(expiresAtStr);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // 2. Recompute HMAC on the server using identical cryptographic inputs
    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${normalizedEmail}.${submittedOtp}.${expiresAt}`);
    const computedHash = hmac.digest('hex');

    // 3. Constant-time comparison to prevent timing side-channel attacks
    const isMatch =
      computedHash.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(expectedHash, 'hex'));

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid verification passcode. Access denied.' });
    }

    // 4. Server-Side RBAC Authority: Determine authorization role strictly on server
    const isSuper = Boolean(SUPER_ADMIN_EMAIL) && normalizedEmail === SUPER_ADMIN_EMAIL;
    let role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' = isSuper ? 'SUPER_ADMIN' : 'USER';

    if (!isSuper) {
      try {
        const GITHUB_REPO = process.env.GITHUB_REPO || 'BSFrameWorks5253/AetherStudy';
        const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;
        if (GH_ACCESS_TOKEN) {
          const resUsers = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/users.json`, {
            headers: {
              Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'AetherStudy-Auth',
            },
          });
          if (resUsers.ok) {
            const json = (await resUsers.json()) as { content: string };
            const users = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
            const found = users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
            if (found && found.role === 'ADMIN') role = 'ADMIN';
          }
        }
      } catch (e) {
        console.warn('Role lookup fallback:', e);
      }
    }

    // 5. Generate secure session token
    const sessionToken = crypto
      .createHmac('sha256', OTP_SECRET)
      .update(`${normalizedEmail}.${Date.now()}`)
      .digest('hex');

    const userStandard = isSuper ? 'ALL' : (standard || '12');

    return res.status(200).json({
      success: true,
      message: 'Authentication validated successfully.',
      user: {
        email: normalizedEmail,
        role,
        standard: userStandard,
        sessionToken,
      },
    });
  } catch (error) {
    console.error('[OTP Verification Internal Error]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
}
