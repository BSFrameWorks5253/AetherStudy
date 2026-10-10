/**
 * AetherStudy Native PWA System Notification Engine
 * Dispatches real OS system tray & lock screen notifications
 * via Service Worker showNotification API across Android & iOS PWA.
 */

import { getUserStorageItem, setUserStorageItem } from '../utils/userStorage';

const READ_ANNOUNCEMENTS_KEY = 'aether_read_announcements';
const NOTIFIED_SYSTEM_IDS_KEY = 'aether_notified_system_ids';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export class NativeNotificationService {
  /**
   * Check if the client browser/PWA supports native notifications
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current native notification permission status
   */
  public getPermission(): NotificationPermissionState {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationPermissionState;
  }

  /**
   * Request user permission to send phone notification tray alerts
   */
  public async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result as NotificationPermissionState;
    } catch {
      return this.getPermission();
    }
  }

  /**
   * Send a native system notification directly to the user's phone notification bar
   */
  public async sendNativeAlert(
    title: string,
    body: string,
    options?: {
      tag?: string;
      url?: string;
      renotify?: boolean;
    }
  ): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const notifOptions: any = {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: options?.tag || 'aether-' + Date.now(),
      renotify: options?.renotify ?? true,
      data: {
        url: options?.url || '/',
      },
    };

    // If Service Worker is registered, use reg.showNotification (Required for Android & iOS PWA status bar)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, notifOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('[NativeNotificationService] SW showNotification fallback:', swErr);
      }
    }

    // Direct window Notification fallback
    try {
      const notif = new Notification(title, notifOptions);
      notif.onclick = () => {
        window.focus();
        if (options?.url) {
          window.location.href = options.url;
        }
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('[NativeNotificationService] Direct Notification error:', e);
      return false;
    }
  }

  /**
   * Read IDs of announcements already viewed by the current user
   */
  public getReadAnnouncementIds(): string[] {
    return getUserStorageItem<string[]>(READ_ANNOUNCEMENTS_KEY, []);
  }

  /**
   * Mark all specified announcements as viewed/read (clears notification badge)
   */
  public markAllRead(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    const existing = new Set(this.getReadAnnouncementIds());
    ids.forEach((id) => existing.add(id));
    setUserStorageItem(READ_ANNOUNCEMENTS_KEY, Array.from(existing));
    window.dispatchEvent(new CustomEvent('aetherstudy_announcements_read_change'));
  }

  /**
   * Mark a single announcement as read
   */
  public markRead(id: string): void {
    this.markAllRead([id]);
  }

  /**
   * Calculate unread count for announcements
   */
  public getUnreadCount(allAnnouncements: { id: string }[]): number {
    const readSet = new Set(this.getReadAnnouncementIds());
    return allAnnouncements.filter((a) => !readSet.has(a.id)).length;
  }

  /**
   * Play modern, subtle 2-tone chime using Web Audio API (Zero latency, no asset files)
   */
  public playNotificationChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Bell chime tone 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Bell chime tone 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.12);
      gain2.gain.setValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);

      // Haptic feedback on supported mobile devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([60, 30, 60]);
      }
    } catch {}
  }

  /**
   * Automatically dispatch system notification and in-app toast for a newly received announcement
   * only if it hasn't been posted yet and user hasn't already read it.
   */
  public notifyIfNew(announcement: { id: string; title: string; message: string; priority?: string }): void {
    if (!announcement?.id) return;
    const readIds = this.getReadAnnouncementIds();
    if (readIds.includes(announcement.id)) return;

    const notifiedIds = getUserStorageItem<string[]>(NOTIFIED_SYSTEM_IDS_KEY, []);
    if (notifiedIds.includes(announcement.id)) return;

    // 1. Dispatch In-App Banner Event (instantly visible on mobile & desktop screens)
    window.dispatchEvent(
      new CustomEvent('aether_new_announcement', {
        detail: announcement,
      })
    );

    // 2. Play acoustic chime
    this.playNotificationChime();

    // 3. Dispatch OS Tray / Lockscreen Notification if granted
    if (this.getPermission() === 'granted') {
      const prefix = announcement.priority === 'urgent' ? '🚨 URGENT: ' : '📢 ';
      this.sendNativeAlert(`${prefix}${announcement.title}`, announcement.message, {
        tag: `notif-${announcement.id}`,
      });
    }

    // 4. Mark as notified to avoid repeating
    notifiedIds.push(announcement.id);
    if (notifiedIds.length > 50) notifiedIds.shift();
    setUserStorageItem(NOTIFIED_SYSTEM_IDS_KEY, notifiedIds);
  }
}

export const nativeNotifications = new NativeNotificationService();

