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

    gainNode.gain.setValueAtTime(0.18, now);
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
  private isSubscribed: boolean = false;

  public async requestPushPermission(userIdentifier?: string, isAdmin: boolean = false, isJuniorAdmin: boolean = false): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Fallback VAPID or auto-generated endpoint subscription
        try {
          // Standard public VAPID key
          const vapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
          const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        } catch {
          // If VAPID is unavailable, proceed with existing registration
        }
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
        return true;
      }
    } catch (err) {
      console.warn("[NotificationManager] Push subscribe non-fatal:", err);
    }
    return false;
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
              // If it's unread, trigger audio chime and callback
              if (!notif.is_read) {
                playNotificationChime();
                if (onNewNotification) onNewNotification(notif);

                // Dispatch window event for Dynamic Island
                window.dispatchEvent(
                  new CustomEvent("axiom_realtime_alert", {
                    detail: {
                      title: notif.title,
                      message: notif.message,
                      type: notif.notification_type,
                      link: notif.link_url,
                    },
                  })
                );
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

    // Continuous polling every 6.5s
    this.pollingInterval = setInterval(fetchLatest, 6500);
  }

  public stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public sendLocalNotification(title: string, message: string, linkUrl?: string) {
    playNotificationChime();
    window.dispatchEvent(
      new CustomEvent("axiom_realtime_alert", {
        detail: {
          title,
          message,
          type: "SYSTEM",
          link: linkUrl,
        },
      })
    );

    // If browser permission is granted and document is hidden (background / minimized), show native notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: message,
            icon: "/icon-192.png",
            badge: "/favicon-32x32.png",
            data: { url: linkUrl || "/#wallet" },
          });
        });
      } catch {}
    }
  }
}

export const notificationService = new NotificationManager();
