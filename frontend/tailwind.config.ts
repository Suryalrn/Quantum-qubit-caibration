import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#141110",    // Rich Warm Obsidian
          secondary: "#1E1917",  // Deep Espresso
          card: "#26201E",       // Roasted Umber Glass Card
          hover: "#342C29",      // Elevated Warm Bronze/Umber
        },
        accent: {
          gold: "#C6A56B",       // Polished Champagne Gold
          amber: "#C66B42",      // Burnt Orange / Warm Amber
          terracotta: "#B85C38", // Deep Terracotta
          ivory: "#F4EFE6",      // Warm Ivory Highlight
          bronze: "#8C6A48",     // Dark Antique Bronze
        },
        status: {
          optimal: "#C6A56B",    // Champagne Gold for optimal fidelity
          warning: "#D9944A",    // Warm Amber for moderate noise
          critical: "#943846",   // Deep Terracotta / Crimson for critical error
          dead: "#702D3A",       // Rich Wine Burgundy for dead physical defects
        },
        text: {
          primary: "#F4EFE6",    // Warm Ivory
          secondary: "#B8ADA0",  // Warm Sand / Pale Taupe
          muted: "#786E64",      // Deep Taupe
        },
        border: {
          subtle: "rgba(244, 239, 230, 0.08)",
          glow: "rgba(198, 165, 107, 0.35)",
        }
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
        sans: ["var(--font-geist-sans)", "Inter", "sans-serif"],
      },
      boxShadow: {
        "gold-glow": "0 0 25px -4px rgba(198, 165, 107, 0.35)",
        "amber-glow": "0 0 25px -4px rgba(198, 107, 66, 0.35)",
        "burgundy-glow": "0 0 25px -4px rgba(112, 45, 58, 0.4)",
        "card-warm": "0 12px 36px 0 rgba(0, 0, 0, 0.45)",
      }
    },
  },
  plugins: [],
};
export default config;
