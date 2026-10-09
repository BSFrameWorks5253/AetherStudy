/**
 * Dynamic Google Drive Link Transformer
 * Automatically extracts unique Google Drive File IDs and generates
 * high-performance streaming, preview embed, and download URLs.
 * Handles CORS bypass fallbacks and various Google Drive URL formats.
 */

// Regex patterns to capture File ID across multiple Google Drive share links
const DRIVE_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /id=([a-zA-Z0-9_-]+)/,
  /\/document\/d\/([a-zA-Z0-9_-]+)/,
  /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
  /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
  /\/open\?id=([a-zA-Z0-9_-]+)/,
  /\/d\/([a-zA-Z0-9_-]+)/,
];

/**
 * Checks whether a given string is a Google Drive URL or File ID
 */
export function isGoogleDriveUrl(urlOrId: string): boolean {
  if (!urlOrId) return false;
  return (
    urlOrId.includes('drive.google.com') ||
    urlOrId.includes('docs.google.com') ||
    /^[a-zA-Z0-9_-]{25,45}$/.test(urlOrId.trim())
  );
}

/**
 * Extracts the unique Google Drive File ID from any shareable link, embed URL, or raw ID.
 */
export function extractDriveFileId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already a clean 25-45 char ID without slashes
  if (!trimmed.includes('/') && /^[a-zA-Z0-9_-]{20,50}$/.test(trimmed)) {
    return trimmed;
  }

  for (const pattern of DRIVE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates the raw stream URL to fetch document bytes for JavaScript / PDF.js parsing.
 */
export function getDriveStreamUrl(urlOrId: string): string {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return urlOrId;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Generates the responsive iframe preview embed URL.
 * Bypasses CORS completely since the browser embeds Google's native viewer.
 */
export function getDrivePreviewUrl(urlOrId: string): string {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return urlOrId;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Generates direct download URL
 */
export function getDriveDownloadUrl(urlOrId: string): string {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return urlOrId;
  return `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
}

/**
 * Generates direct high-resolution document thumbnail URL (useful for archive cards)
 */
export function getDriveThumbnailUrl(urlOrId: string, width: number = 400): string {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return '';
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

export interface DriveUrlBundle {
  original: string;
  fileId: string | null;
  isDrive: boolean;
  streamUrl: string;
  previewUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
}

/**
 * Transforms any URL or ID into a complete bundle of optimized endpoints.
 */
export function transformDocumentUrl(urlOrId: string): DriveUrlBundle {
  const isDrive = isGoogleDriveUrl(urlOrId);
  const fileId = extractDriveFileId(urlOrId);

  if (isDrive && fileId) {
    return {
      original: urlOrId,
      fileId,
      isDrive: true,
      streamUrl: getDriveStreamUrl(fileId),
      previewUrl: getDrivePreviewUrl(fileId),
      downloadUrl: getDriveDownloadUrl(fileId),
      thumbnailUrl: getDriveThumbnailUrl(fileId),
    };
  }

  return {
    original: urlOrId,
    fileId: null,
    isDrive: false,
    streamUrl: urlOrId,
    previewUrl: urlOrId,
    downloadUrl: urlOrId,
    thumbnailUrl: '',
  };
}

export default transformDocumentUrl;
