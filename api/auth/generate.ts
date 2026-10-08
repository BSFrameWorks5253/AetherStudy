import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import crypto from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'aether-antigravity-secure-session-key-2026';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enforce POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is strictly required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 1. Generate secure 6-digit OTP code strictly on the server
    const otp = crypto.randomInt(100000, 999999).toString();

    // 2. 10-minute expiry window
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // 3. Cryptographically sign the payload so the frontend never sees the raw code
    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${normalizedEmail}.${otp}.${expiresAt}`);
    const hash = hmac.digest('hex');
    const maskedConfirmationToken = `${expiresAt}.${hash}`;

    // 4. Dispatch email via Resend
    let emailDispatched = false;
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: 'AetherStudy Security <onboarding@resend.dev>',
        to: normalizedEmail,
        subject: `Your AetherStudy Verification Code: ${otp}`,
        html: `
          <div style="background-color: #030712; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #a78bfa; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AetherStudy Suite</h2>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Secure Single-Use Authentication</p>
            </div>
            <div style="background-color: #0f172a; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="color: #cbd5e1; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; margin: 0 0 10px 0;">Your 6-Digit Passcode</p>
              <div style="font-size: 36px; font-family: 'JetBrains Mono', monospace; font-weight: 900; letter-spacing: 6px; color: #38bdf8;">${otp}</div>
              <p style="color: #64748b; font-size: 11px; margin: 12px 0 0 0;">Valid for 10 minutes. Do not share this code.</p>
            </div>
            <p style="color: #64748b; font-size: 11px; text-align: center; line-height: 1.5;">If you did not request this verification code, please ignore this email.</p>
          </div>
        `,
      });
      emailDispatched = true;
    } else {
      // Development console fallback when API key is not yet in .env
      console.log(`\n[SECURITY DISPATCH] Generated OTP for ${normalizedEmail}: >>> ${otp} <<< (Expires: 10 mins)\n`);
    }

    // Masked email for display (e.g. s***@gmail.com)
    const [userPart, domainPart] = normalizedEmail.split('@');
    const maskedEmail = `${userPart[0]}***@${domainPart}`;

    return res.status(200).json({
      success: true,
      message: emailDispatched ? 'Secure code sent to your email.' : 'Secure code generated.',
      token: maskedConfirmationToken,
      maskedEmail,
    });
  } catch (error: any) {
    console.error('[OTP Generation Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch verification code.' });
  }
}
