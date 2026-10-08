/**
 * Client-Side Free Consumer Google Drive Engine
 * 100% Free OAuth flow (No Google Cloud billing account or service account required)
 * Streams large study PDFs directly from the browser to the user's Google Drive.
 */

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface DriveUploadResult {
  id: string;
  name: string;
  size: string;
  streamUrl: string;
  subject: string;
  uploadedBy: string;
  uploadedAt: string;
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
const GOOGLE_APPS_SCRIPT_URL = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string) || '';

let accessToken: string | null = null;
let tokenClient: any = null;

// Dynamically inject Google Identity Services script
export function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // Graceful degradation
    document.head.appendChild(script);
  });
}

// Request free consumer OAuth access token via popup
export async function requestGoogleDriveToken(): Promise<string> {
  await loadGoogleIdentityScript();

  if (accessToken) return accessToken;

  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not configured. Using local direct storage.'));
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK failed to load.'));
      return;
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (tokenResponse: any) => {
        if (tokenResponse?.access_token) {
          accessToken = tokenResponse.access_token;
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error(tokenResponse?.error || 'Failed to authenticate Google Account'));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

// Upload file directly from browser to Google Drive (via Apps Script or OAuth)
export async function uploadDirectToGoogleDrive(
  file: File,
  subject: string,
  uploaderEmail: string
): Promise<DriveUploadResult> {
  // Option 1: 100% Free Google Apps Script Web App (Zero GCP, Zero Service Accounts)
  if (GOOGLE_APPS_SCRIPT_URL) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res.includes(',') ? res.split(',')[1] : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const gasRes = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type || 'application/pdf',
        subject,
      }),
    });

    let gasJson: any = null;
    try {
      gasJson = await gasRes.json();
    } catch {
      const text = await gasRes.text().catch(() => '');
      try {
        gasJson = JSON.parse(text);
      } catch {
        console.warn('Apps Script returned non-JSON response:', text);
      }
    }

    if (gasJson && (gasJson.success || gasJson.id)) {
      const fileId = gasJson.id || `gas-${Date.now()}`;
      const previewUrl =
        gasJson.streamUrl ||
        gasJson.url ||
        `https://drive.google.com/file/d/${fileId}/preview`;

      return {
        id: fileId,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        streamUrl: previewUrl,
        subject,
        uploadedBy: uploaderEmail,
        uploadedAt: gasJson.uploadedAt || new Date().toISOString(),
      };
    } else {
      throw new Error(gasJson?.error || 'Apps Script Drive upload failed');
    }
  }

  // Option 2: Free Consumer Google OAuth Popup
  const token = await requestGoogleDriveToken();

  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/pdf',
    description: `Subject: ${subject} | AetherStudy Zero-Cost Vault | Uploaded by: ${uploaderEmail}`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileData = await file.arrayBuffer();

  const multipartRequestBody = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${file.type || 'application/pdf'}\r\n\r\n`,
      fileData,
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  // 1. Stream file directly to Google Drive
  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Google Drive client upload failed.');
  }

  const uploadJson = await uploadRes.json();
  const fileId = uploadJson.id;

  // 2. Make file publicly viewable as reader for embedded streaming
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('[Permission warning, file still saved]:', permErr);
  }

  const streamUrl = `https://drive.google.com/file/d/${fileId}/preview`;

  return {
    id: fileId,
    name: file.name,
    size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    streamUrl,
    subject,
    uploadedBy: uploaderEmail,
    uploadedAt: new Date().toISOString(),
  };
}
