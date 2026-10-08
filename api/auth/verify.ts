import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'aether-antigravity-secure-session-key-2026';
const SUPER_ADMIN_EMAIL = 'sounasathburhan5252@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { email, otp, token } = req.body || {};

  if (!email || !otp || !token) {
    return res.status(400).json({ error: 'Email, OTP, and validation token are all required.' });
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
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Recompute HMAC on the server using identical inputs
    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${normalizedEmail}.${submittedOtp}.${expiresAt}`);
    const computedHash = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isMatch =
      computedHash.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(expectedHash, 'hex'));

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Determine authorization role
    const isSuper = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();
    const role = isSuper ? 'SUPER_ADMIN' : 'USER';

    // Generate secure session token
    const sessionToken = crypto
      .createHmac('sha256', OTP_SECRET)
      .update(`${normalizedEmail}.${Date.now()}`)
      .digest('hex');

    return res.status(200).json({
      success: true,
      message: 'Authentication validated successfully.',
      user: {
        email: normalizedEmail,
        role,
        sessionToken,
      },
    });
  } catch (error: any) {
    console.error('[OTP Verification Error]:', error);
    return res.status(500).json({ error: error.message || 'Internal verification failure.' });
  }
}
