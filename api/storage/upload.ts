import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

const GOOGLE_CREDENTIALS_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'BSFrameWorks5253/AetherStudy';

async function getGoogleDriveClient() {
  if (!GOOGLE_CREDENTIALS_JSON) return null;

  try {
    let credentials: any;
    if (GOOGLE_CREDENTIALS_JSON.startsWith('{')) {
      credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON);
    } else {
      // If path to credentials JSON file is provided
      credentials = JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_JSON, 'utf8'));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (err) {
    console.error('[Google Drive Auth Client Initialization Error]:', err);
    return null;
  }
}

async function recordToGitHubDatabase(docRecord: any) {
  if (!GH_ACCESS_TOKEN) return;

  try {
    // 1. Fetch current documents list from GitHub
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/documents.json`;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AetherStudy-Storage',
      },
    });

    let currentDocs: any[] = [];
    let currentSha: string | undefined = undefined;

    if (getRes.ok) {
      const json = (await getRes.json()) as { content: string; sha: string };
      currentDocs = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
      currentSha = json.sha;
    }

    // 2. Prepend new document record
    currentDocs = [docRecord, ...currentDocs];

    // 3. Write back to GitHub
    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GH_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'AetherStudy-Storage',
      },
      body: JSON.stringify({
        message: `storage: record new Google Drive document [${docRecord.name}]`,
        content: Buffer.from(JSON.stringify(currentDocs, null, 2), 'utf8').toString('base64'),
        sha: currentSha,
      }),
    });
  } catch (err) {
    console.error('[GitHub DB Document Pointer Recording Error]:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { fileName, fileBase64, mimeType, subject, uploaderEmail } = req.body || {};

  if (!fileName || !fileBase64) {
    return res.status(400).json({ error: 'File name and file content buffer are strictly required.' });
  }

  try {
    // Decode base64 buffer
    const base64Data = fileBase64.includes(';base64,') ? fileBase64.split(';base64,')[1] : fileBase64;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const targetMime = mimeType || 'application/pdf';

    const driveClient = await getGoogleDriveClient();

    let streamUrl = '';
    let driveFileId = `gdrive-${Date.now()}`;

    if (driveClient) {
      // 1. Create file in Google Drive
      const fileMetadata: any = {
        name: fileName,
        description: `Subject: ${subject || 'General'} | Uploader: ${uploaderEmail || 'Admin'}`,
      };
      if (GOOGLE_DRIVE_FOLDER_ID) {
        fileMetadata.parents = [GOOGLE_DRIVE_FOLDER_ID];
      }

      const media = {
        mimeType: targetMime,
        body: Readable.from(fileBuffer),
      };

      const driveRes = await driveClient.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink',
      });

      driveFileId = driveRes.data.id || driveFileId;

      // 2. Set permissions to anyone/reader for streaming
      await driveClient.permissions.create({
        fileId: driveFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Sandboxed preview embed URL
      streamUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;
    } else {
      // Offline local development fallback
      const uploadDir = path.join(process.cwd(), 'server', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      fs.writeFileSync(path.join(uploadDir, safeName), fileBuffer);
      streamUrl = `/uploads/${safeName}`;
      console.log(`[STORAGE DISPATCH] Saved locally: ${safeName} (Configure GOOGLE_SERVICE_ACCOUNT_CREDENTIALS for Drive upload)`);
    }

    const documentRecord = {
      id: driveFileId,
      name: fileName,
      subject: subject || 'General',
      size: `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
      url: streamUrl,
      streamUrl: streamUrl,
      uploadedBy: uploaderEmail || 'admin',
      uploadedAt: new Date().toISOString(),
    };

    // 3. Atomically write the document pointer to hidden GitHub JSON DB
    await recordToGitHubDatabase(documentRecord);

    return res.status(200).json({
      success: true,
      document: documentRecord,
    });
  } catch (error) {
    console.error('[Google Drive Storage Upload Internal Error]:', error);
    return res.status(500).json({ error: 'Internal security node allocation error.' });
  }
}
