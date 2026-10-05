import { api } from "./api";

// Subtle pleasant notification chime using Web Audio API (zero audio file dependencies)
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Harmonic bell tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  } catch (e) {
    // Audio context may be restricted by browser until user gesture
  }
}

// Convert VAPID public key
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
  private pollingInterval: any = null;
  public isSubscribed: boolean = false;

  public getPermissionState(): "granted" | "denied" | "default" | "unsupported" {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission as "granted" | "denied" | "default";
  }

  public async showNativePhoneNotification(title: string, message: string, linkUrl?: string, tag?: string) {
    playNotificationChime();

    // 1. Dispatch custom event for in-app Dynamic Island popup
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("axiom_realtime_alert", {
          detail: {
            title,
            message,
            link: linkUrl || "/#wallet",
          },
        })
      );
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

  public async requestPushPermission(userIdentifier?: string, isAdmin: boolean = false, isJuniorAdmin: boolean = false): Promise<"granted" | "denied" | "default" | "unsupported"> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        if ("serviceWorker" in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
              const vapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
              const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
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
            console.warn("[NotificationManager] Push subscribe service worker non-fatal:", e);
          }
        }

        // Send instant test notification to verify delivery on this phone
        await this.showNativePhoneNotification(
          "🔔 Phone Notifications Enabled!",
          "Axiom Wallet will now deliver real-time transfer, deposit, and trade alerts directly to your phone.",
          "/#wallet"
        );
      }
      return permission as any;
    } catch (err) {
      console.warn("[NotificationManager] Permission request error:", err);
      return "denied";
    }
  }

  public startPolling(userIdentifier?: string, role?: string, onNewNotification?: (notif: any) => void) {
    if (typeof window === "undefined") return;
    this.stopPolling();

    const fetchLatest = async () => {
      try {
        const res = await api.getUserNotifications(userIdentifier, role);
        if (res && res.notifications && Array.isArray(res.notifications)) {
          for (const notif of res.notifications) {
            if (!this.lastKnownIds.has(notif.id)) {
              this.lastKnownIds.add(notif.id);
              // If it's unread, trigger audio chime, in-app banner, AND native OS lockscreen notification
              if (!notif.is_read) {
                this.showNativePhoneNotification(
                  notif.title || "Axiom Wallet Alert",
                  notif.message || "You have a new transaction update.",
                  notif.link_url || "/#wallet",
                  notif.id
                );
                if (onNewNotification) onNewNotification(notif);
              }
            }
          }
        }
      } catch (err) {
        // Silently handle offline/polling error
      }
    };

    // First fetch after 1s
    setTimeout(fetchLatest, 1000);

    // Continuous polling every 4.5s
    this.pollingInterval = setInterval(fetchLatest, 4500);
  }

  public stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public sendLocalNotification(title: string, message: string, linkUrl?: string) {
    this.showNativePhoneNotification(title, message, linkUrl);
  }
}

export const notificationService = new NotificationManager();

