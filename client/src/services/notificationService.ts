import { api } from "./api";

// Matching VAPID public key from backend settings.py
const VAPID_PUBLIC_KEY = "BKpF4yNKHCYdO1dGmqJgZkQWRfQyOhuCq6ZPLwumaa2WDrHXbq97IfHmR0aCmBYZDkkJvW8cbGc_a3J88ILTbKk";

// Subtle pleasant Bybit-style notification chime using Web Audio API (zero audio asset latency)
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Harmonic dual-sine bell tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  } catch (e) {
    // Audio context restricted until user interaction
  }
}

// Pre-unlock Web Audio API on initial user interaction so subsequent notification sounds are never blocked
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const dummyCtx = new AudioContextClass();
        dummyCtx.resume().then(() => {
          dummyCtx.close();
        });
      }
    } catch {}
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
}

// Convert VAPID public key base64 to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class NotificationManager {
  private lastKnownIds: Set<string> = new Set();
  private isFirstSync: boolean = true;
  private pollingInterval: any = null;
  private currentUserIdentifier: string = "";
  private currentRole: string = "user";
  private onNewNotificationCallback?: (notif: any) => void;
  public isSubscribed: boolean = false;

  constructor() {
    this.loadSeenIds();
  }

  private loadSeenIds() {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("axiom_seen_notif_ids");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.lastKnownIds = new Set(parsed);
        }
      }
    } catch {}
  }

  private saveSeenIds() {
    if (typeof window === "undefined") return;
    try {
      const arr = Array.from(this.lastKnownIds).slice(-300);
      localStorage.setItem("axiom_seen_notif_ids", JSON.stringify(arr));
    } catch {}
  }

  public getPermissionState(): "granted" | "denied" | "default" | "unsupported" {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission as "granted" | "denied" | "default";
  }

  public async showNativePhoneNotification(title: string, message: string, linkUrl?: string, tag?: string) {
    playNotificationChime();

    // 1. Dispatch custom event for in-app Dynamic Island popup & instant flash
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("axiom_realtime_alert", {
          detail: {
            title,
            message,
            link: linkUrl || "/#wallet",
            tag,
          },
        })
      );
      if (title.toLowerCase().includes("deposit") || message.toLowerCase().includes("deposit")) {
        window.dispatchEvent(
          new CustomEvent("axiom_deposit_alert", {
            detail: { title, message, link: linkUrl || "/#wallet", tag },
          })
        );
      }
    }

    // 2. Dispatch native OS / phone notification via Service Worker
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.showNotification) {
            await registration.showNotification(title, {
              body: message,
              icon: "/icon-192.png",
              badge: "/favicon-32x32.png",
              vibrate: [200, 100, 200, 100, 200],
              tag: tag || `axiom-${Date.now()}`,
              renotify: true,
              data: { url: linkUrl || "/#wallet" },
            } as any);
            return;
          }
        }
        // Fallback standard Notification
        new Notification(title, {
          body: message,
          icon: "/icon-192.png",
          data: { url: linkUrl || "/#wallet" },
        });
      } catch (err) {
        console.warn("[NotificationManager] Native showNotification warning:", err);
      }
    }
  }

  public async autoSyncPushSubscription(userIdentifier?: string, isAdmin: boolean = false, isJuniorAdmin: boolean = false) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      if (subscription) {
        const p256dh = subscription.getKey("p256dh");
        const auth = subscription.getKey("auth");
        const p256dhStr = p256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))) : "";
        const authStr = auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : "";

        await api.subscribePushNotification({
          endpoint: subscription.endpoint,
          p256dh: p256dhStr,
          auth: authStr,
          user_identifier: userIdentifier,
          is_admin_device: isAdmin,
          is_junior_admin_device: isJuniorAdmin,
        });

        this.isSubscribed = true;
      }
    } catch (e) {
      console.warn("[NotificationManager] autoSyncPushSubscription warning:", e);
    }
  }

  public async requestPushPermission(userIdentifier?: string, isAdmin: boolean = false, isJuniorAdmin: boolean = false): Promise<"granted" | "denied" | "default" | "unsupported"> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await this.autoSyncPushSubscription(userIdentifier, isAdmin, isJuniorAdmin);
      }
      return permission as any;
    } catch (err) {
      console.warn("[NotificationManager] Permission request error:", err);
      return "denied";
    }
  }

  public triggerImmediateSync = async () => {
    if (typeof window === "undefined") return;
    const isExplicitAdmin = this.currentRole === "admin" ||
      (typeof localStorage !== "undefined" && localStorage.getItem("axiom_admin_auth") === "true") ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("axiom_admin_auth") === "true");

    const activeId = this.currentUserIdentifier ||
      (typeof localStorage !== "undefined" ? (localStorage.getItem("axiom_wallet_address") || localStorage.getItem("axiom_user_id") || "") : "") ||
      (isExplicitAdmin ? "admin" : "");
    if (!activeId && !isExplicitAdmin) return;

    try {
      const res = await api.getUserNotifications(activeId || "admin", isExplicitAdmin ? "admin" : this.currentRole);
      if (res && res.notifications && Array.isArray(res.notifications)) {
        // If this is the initial load upon opening the app, alert for any genuinely unread
        // recent notifications (last 30 minutes) that haven't been shown yet!
        if (this.isFirstSync) {
          this.isFirstSync = false;
          const cutoff = Date.now() - 30 * 60 * 1000;
          let alertedFirstSync = 0;
          for (const notif of res.notifications) {
            const nTime = new Date(notif.created_at || Date.now()).getTime();
            if (!notif.is_read && nTime > cutoff && !this.lastKnownIds.has(notif.id)) {
              this.lastKnownIds.add(notif.id);
              if (alertedFirstSync < 2) {
                alertedFirstSync++;
                this.showNativePhoneNotification(
                  notif.title || "Axiom Wallet Alert",
                  notif.message || "You have a new transaction update.",
                  notif.link_url || "/#wallet",
                  notif.id
                );
              }
              if (this.onNewNotificationCallback) this.onNewNotificationCallback(notif);
            } else {
              this.lastKnownIds.add(notif.id);
            }
          }
          this.saveSeenIds();
          return;
        }

        let newAlertsCount = 0;
        for (const notif of res.notifications) {
          if (!this.lastKnownIds.has(notif.id)) {
            this.lastKnownIds.add(notif.id);
            // Only genuinely new unread notifications that arrive while the user is using the app trigger alerts
            if (!notif.is_read) {
              newAlertsCount++;
              // Chime & notify for incoming alerts
              if (newAlertsCount <= 2) {
                this.showNativePhoneNotification(
                  notif.title || "Axiom Wallet Alert",
                  notif.message || "You have a new transaction update.",
                  notif.link_url || (isExplicitAdmin ? "/admin#deposits" : "/#wallet"),
                  notif.id
                );
              }
              if (this.onNewNotificationCallback) this.onNewNotificationCallback(notif);
            }
          }
        }
        if (newAlertsCount > 0) {
          this.saveSeenIds();
        }
      }
    } catch (err) {
      // Silently ignore network hiccup
    }
  };

  public startPolling(userIdentifier?: string, role?: string, onNewNotification?: (notif: any) => void) {
    if (typeof window === "undefined") return;
    this.stopPolling();

    const isAdmin = role === "admin" ||
      (typeof window !== "undefined" && (
        localStorage.getItem("axiom_admin_auth") === "true" ||
        sessionStorage.getItem("axiom_admin_auth") === "true" ||
        window.location.pathname.includes("/admin") ||
        window.location.hash.includes("#admin")
      ));

    const fallbackId = (typeof localStorage !== "undefined" ? (localStorage.getItem("axiom_wallet_address") || localStorage.getItem("axiom_user_id") || "") : "") || (isAdmin ? "admin" : "");
    const newId = userIdentifier || fallbackId;
    if (this.currentUserIdentifier !== newId) {
      this.isFirstSync = true;
    }
    this.currentUserIdentifier = newId;
    this.currentRole = isAdmin ? "admin" : (role || "user");
    this.onNewNotificationCallback = onNewNotification;

    // First fetch immediately
    this.triggerImmediateSync();

    // Try background push auto-sync if granted
    this.autoSyncPushSubscription(newId, isAdmin);

    // Continuous ultra-fast polling every 2.0s
    this.pollingInterval = setInterval(this.triggerImmediateSync, 2000);

    // Instant Zero-Delay Wakeup Hooks
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("focus", this.handleWindowFocus);
    window.addEventListener("online", this.handleOnline);
  }

  private handleVisibilityChange = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      this.triggerImmediateSync();
    }
  };

  private handleWindowFocus = () => {
    this.triggerImmediateSync();
  };

  private handleOnline = () => {
    this.triggerImmediateSync();
  };

  public stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      window.removeEventListener("focus", this.handleWindowFocus);
      window.removeEventListener("online", this.handleOnline);
    }
  }

  public sendLocalNotification(title: string, message: string, linkUrl?: string) {
    this.showNativePhoneNotification(title, message, linkUrl);
  }
}

export const notificationService = new NotificationManager();

