import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import * as crypto from 'crypto';

const OTP_SECRET =
  process.env.OTP_SECRET ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  'aether-antigravity-secure-session-key-2026';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Strictly enforce POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is strictly required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 2. Cryptographic server-side 6-digit OTP generation (never seen by client)
    const otp = crypto.randomInt(100000, 999999).toString();

    // 3. 10-minute expiry epoch
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // 4. HMAC-SHA256 signature binding email + OTP + expiry
    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${normalizedEmail}.${otp}.${expiresAt}`);
    const hash = hmac.digest('hex');
    const maskedConfirmationToken = `${expiresAt}.${hash}`;

    // 5. Dispatch email via Resend if credentials exist
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailDispatched = false;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const { error: resendErr } = await resend.emails.send({
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

        if (resendErr) {
          console.warn('[Resend API Dispatch Warning]:', resendErr);
          console.log(`[PASSCODE BACKUP] Generated code for ${normalizedEmail}: >>> ${otp} <<< (Expires: 10m)`);
        } else {
          emailDispatched = true;
        }
      } catch (dispatchErr) {
        console.warn('[Resend Dispatch Exception]:', dispatchErr);
        console.log(`[PASSCODE BACKUP] Generated code for ${normalizedEmail}: >>> ${otp} <<< (Expires: 10m)`);
      }
    } else {
      console.log(`[PASSCODE DISPATCH] Generated code for ${normalizedEmail}: >>> ${otp} <<< (Expires: 10m)`);
    }

    // 6. Return strictly masked confirmation token — NEVER raw OTP
    const [userPart, domainPart] = normalizedEmail.split('@');
    const maskedEmail = `${userPart[0]}***@${domainPart}`;

    return res.status(200).json({
      success: true,
      message: emailDispatched ? 'Secure code sent to your email.' : 'Secure verification token initialized.',
      token: maskedConfirmationToken,
      maskedEmail,
    });
  } catch (error) {
    console.error('[OTP Generation Internal Error]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
}
