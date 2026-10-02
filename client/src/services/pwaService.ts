// Axiom Wallet PWA & Home Screen Service
// Handles Android beforeinstallprompt, iOS standalone detection, and installation flows

export function getIsIOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function getIsAndroid(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://") ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export function getIsInAppBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera || "";
  return /FBAN|FBAV|Twitter|Instagram|LinkedIn|WhatsApp|Telegram|Line|MicroMessenger|Snapchat|BytedanceWebview/i.test(ua);
}

let deferredPrompt: any = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

if (typeof window !== "undefined") {
  // Capture beforeinstallprompt event on Chromium browsers
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  // Clear prompt when app is successfully installed
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export const pwaService = {
  isIOS: getIsIOS(),
  isAndroid: getIsAndroid(),
  get isStandalone(): boolean {
    return getIsStandalone();
  },
  get canPrompt(): boolean {
    return !!deferredPrompt;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async promptNativeInstall(): Promise<{ outcome: "accepted" | "dismissed" | "unavailable" }> {
    if (!deferredPrompt) {
      return { outcome: "unavailable" };
    }
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        deferredPrompt = null;
        notify();
      }
      return choiceResult;
    } catch (e) {
      console.warn("[Axiom PWA] Install prompt exception:", e);
      return { outcome: "unavailable" };
    }
  },
};
