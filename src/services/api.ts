import { UserProfile, UserRole } from '../types/auth';
import { TestPaper } from '../types/testPaper';

export interface ServerDocument {
  id: string;
  name: string;
  originalName: string;
  serverUrl: string;
  streamUrl?: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  subject: string;
}

export interface ServerHealth {
  status: string;
  appName: string;
  timestamp: string;
  security: {
    helmet: string;
    rateLimiting: string;
    fileValidation: string;
    maxUploadMb: number;
  };
  uploadsCount: number;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

export const api = {
  // 1. Passwordless Authentication & Server-Side OTP
  async generateOtp(email: string): Promise<{ success: boolean; message: string; token: string; maskedEmail: string }> {
    const res = await fetch(`${API_BASE}/auth/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to dispatch verification code');
    }
    return res.json();
  },

  async verifyOtp(email: string, otp: string, token: string): Promise<{ success: boolean; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, token }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid verification code');
    }
    return res.json();
  },

  async login(email: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async getUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch user list');
    return res.json();
  },

  async updateUserRole(
    requesterEmail: string,
    targetEmail: string,
    newRole: UserRole
  ): Promise<{ success: boolean; updatedUser: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/users/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterEmail, targetEmail, newRole }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update user role');
    }
    return res.json();
  },

  // 2. Test Papers & PYQ Vault API
  async getTestPapers(): Promise<TestPaper[]> {
    const res = await fetch(`${API_BASE}/test-papers`);
    if (!res.ok) throw new Error('Failed to fetch test papers');
    return res.json();
  },

  async uploadTestPaper(formData: FormData): Promise<TestPaper> {
    const res = await fetch(`${API_BASE}/test-papers/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload test paper');
    }
    return res.json();
  },

  async deleteTestPaper(id: string, requesterEmail: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/test-papers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterEmail }),
    });
    return res.ok;
  },

  // 3. Subjects Management
  async getSubjects(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/subjects`);
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  },

  async createSubject(name: string): Promise<{ subjects: string[]; created: string }> {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create new subject');
    return res.json();
  },

  // 4. Documents Storage API
  async getDocuments(): Promise<ServerDocument[]> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents from server');
    return res.json();
  },

  async uploadDocument(
    file: File,
    subject: string = 'General',
    uploadedBy: string = ''
  ): Promise<ServerDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('uploadedBy', uploadedBy);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Server file upload failed');
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  // 5. Notes Storage API
  async getNotes(): Promise<{ content: string; updatedAt: string }> {
    const res = await fetch(`${API_BASE}/notes`);
    if (!res.ok) throw new Error('Failed to fetch notes from server');
    return res.json();
  },

  async saveNotes(content: string): Promise<{ success: boolean; updatedAt: string }> {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to save notes to server');
    return res.json();
  },

  // 6. Syllabus Storage API
  async getSyllabus<T>(): Promise<T> {
    const res = await fetch(`${API_BASE}/syllabus`);
    if (!res.ok) throw new Error('Failed to fetch syllabus from server');
    return res.json();
  },

  async saveSyllabus<T>(topics: T): Promise<{ success: boolean; count: number }> {
    const res = await fetch(`${API_BASE}/syllabus`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics }),
    });
    if (!res.ok) throw new Error('Failed to save syllabus to server');
    return res.json();
  },

  // 7. Timetable Storage API
  async getTimetable<T>(): Promise<T> {
    const res = await fetch(`${API_BASE}/timetable`);
    if (!res.ok) throw new Error('Failed to fetch timetable from server');
    return res.json();
  },

  async saveTimetable<T>(slots: T): Promise<{ success: boolean; count: number }> {
    const res = await fetch(`${API_BASE}/timetable`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots }),
    });
    if (!res.ok) throw new Error('Failed to save timetable to server');
    return res.json();
  },

  // 8. Pomodoro Storage API
  async getPomodoro<T>(): Promise<T> {
    const res = await fetch(`${API_BASE}/pomodoro`);
    if (!res.ok) throw new Error('Failed to fetch pomodoro from server');
    return res.json();
  },

  async savePomodoro<T>(payload: T): Promise<T> {
    const res = await fetch(`${API_BASE}/pomodoro`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save pomodoro to server');
    return res.json();
  },

  // 9. Zero-Cost Hidden GitHub Database Sync API
  async syncGet<T>(file: string): Promise<T> {
    const res = await fetch(`${API_BASE}/db/sync?file=${encodeURIComponent(file)}`);
    if (!res.ok) throw new Error('Database sync query failed');
    const json = await res.json();
    return json.data;
  },

  async syncPut<T>(file: string, data: T): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/db/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, data }),
    });
    if (!res.ok) throw new Error('Database sync write failed');
    return res.json();
  },

  // 10. Super Admin Google Drive Storage Upload API
  async uploadToGoogleDrive(
    file: File,
    subject: string,
    uploaderEmail: string
  ): Promise<{ success: boolean; document: any }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch(`${API_BASE}/storage/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileBase64: base64,
              mimeType: file.type || 'application/pdf',
              subject,
              uploaderEmail,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to upload document to Google Drive storage');
          }
          const data = await res.json();
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  // 11. Attach Google Drive Stream Link to Syllabus and Documents Database
  async attachDriveDoc(subject: string, document: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/db/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'attach-drive-doc',
        subject,
        document,
      }),
    });
    if (!res.ok) throw new Error('Failed to attach document to syllabus in database');
    return res.json();
  },
};

