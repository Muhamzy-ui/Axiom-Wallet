/**
 * Safe clipboard copy utility that works reliably across:
 * - Secure contexts (HTTPS, localhost)
 * - Insecure contexts (HTTP over LAN IP e.g. http://172.20.10.3:5173)
 * - Iframes and mobile simulator extensions
 * - iOS Safari & Android Chrome
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard if available
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_err) {
      // Fall through to fallback
    }
  }

  // 2. Fallback using document.execCommand('copy')
  if (typeof document !== "undefined") {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.contain = "strict";
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.fontSize = "12pt"; // Prevent zoom on iOS
      document.body.appendChild(el);

      const selection = document.getSelection();
      let originalRange: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        originalRange = selection.getRangeAt(0);
      }

      el.select();
      el.selectionStart = 0;
      el.selectionEnd = text.length;

      const success = document.execCommand("copy");
      document.body.removeChild(el);

      if (selection && originalRange) {
        selection.removeAllRanges();
        selection.addRange(originalRange);
      }
      return success;
    } catch (_e) {
      return false;
    }
  }

  return false;
}
