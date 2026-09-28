/**
 * avatar.ts
 * Generates unique Phantom-style geometric & gradient identity avatars for every user.
 * Supports deterministic generation from username/seed, preset selection, and custom photo upload.
 */

// 6 Sleek Phantom Preset Identities
export interface AvatarPreset {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  icon: string;
}

export const PHANTOM_AVATAR_PRESETS: AvatarPreset[] = [
  { id: "phantom-neon", name: "Phantom Ghost", gradient: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)", accent: "#A78BFA", icon: "👻" },
  { id: "solana-sol", name: "Solana Apex", gradient: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)", accent: "#14F195", icon: "⚡" },
  { id: "cyber-punk", name: "Cyber Punk", gradient: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)", accent: "#F472B6", icon: "🤖" },
  { id: "astro-bull", name: "Astro Bull", gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)", accent: "#FCD34D", icon: "🐂" },
  { id: "crypto-whale", name: "Whale Alpha", gradient: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)", accent: "#67E8F9", icon: "🐋" },
  { id: "sol-ninja", name: "Shadow Ninja", gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)", accent: "#34D399", icon: "🥷" },
];

/**
 * Deterministically generates an SVG data-URI avatar from a seed string (username or address).
 * Produces smooth, beautiful radial and angular gradients with glowing geometry (just like Phantom).
 */
export function generatePhantomAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 80 + Math.abs((hash >> 3) % 120)) % 360;
  const hue3 = (hue2 + 60) % 360;

  const color1 = `hsl(${hue1}, 85%, 60%)`;
  const color2 = `hsl(${hue2}, 90%, 45%)`;
  const color3 = `hsl(${hue3}, 95%, 55%)`;

  const cx1 = 20 + Math.abs((hash >> 2) % 60);
  const cy1 = 20 + Math.abs((hash >> 4) % 60);
  const cx2 = 20 + Math.abs((hash >> 6) % 60);
  const cy2 = 20 + Math.abs((hash >> 8) % 60);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <radialGradient id="g1" cx="${cx1}%" cy="${cy1}%" r="75%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </radialGradient>
      <radialGradient id="g2" cx="${cx2}%" cy="${cy2}%" r="60%">
        <stop offset="0%" stop-color="${color3}" stop-opacity="0.8" />
        <stop offset="100%" stop-color="${color2}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#g1)" />
    <circle cx="${cx2}" cy="${cy2}" r="38" fill="url(#g2)" />
    <polygon points="50,18 78,50 50,82 22,50" fill="rgba(255, 255, 255, 0.16)" />
    <circle cx="50" cy="50" r="16" fill="rgba(255, 255, 255, 0.28)" />
    <circle cx="50" cy="50" r="8" fill="#FFFFFF" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generatePresetAvatar(preset: AvatarPreset): string {
  const colors = preset.gradient.match(/#[0-9a-fA-F]{6}/g) || ["#7C3AED", "#3B82F6"];
  const c1 = colors[0] || "#7C3AED";
  const c2 = colors[1] || colors[0] || "#3B82F6";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="pgrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#pgrad)" />
    <circle cx="50" cy="50" r="38" fill="rgba(255, 255, 255, 0.14)" stroke="${preset.accent}" stroke-width="2" />
    <circle cx="50" cy="50" r="28" fill="rgba(0, 0, 0, 0.25)" />
    <text x="50" y="58" font-size="32" text-anchor="middle" dominant-baseline="middle">${preset.icon}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
