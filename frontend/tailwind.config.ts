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
          primary: "#06070B",    // Cryogenic Vacuum Obsidian
          secondary: "#0B0F19",  // Deep Cryostat Slate
          card: "#0E1422",       // Ionized Quantum Translucent Glass
          hover: "#141C30",      // Elevated Waveguide Blue-Gray
          elevated: "#18223B",   // Superconducting Surface
        },
        accent: {
          gold: "#E5C07B",       // Superconducting Cryogenic Gold
          "gold-light": "#F5D78E",
          cyan: "#00F0FF",       // Quantum Coherence Cherenkov Cyan
          "cyan-glow": "#38BDF8",// Cryo RF Waveguide Azure
          neural: "#818CF8",     // Synaptic Graph Neural Synapse
          amber: "#F59E0B",      // Parameter Drift Warning
          copper: "#E07A5F",     // Microwave Coaxial Copper
          ivory: "#F8FAFC",      // High-Purity Clean White
          bronze: "#947858",     // Cryostat Mounting Bronze
        },
        status: {
          optimal: "#00F0FF",    // Coherent Cyan for high-fidelity qubits
          warning: "#F59E0B",    // Warm Amber for moderate drift
          critical: "#F43F5E",   // Laser Rose/Crimson for high error
          dead: "#EF4444",       // Defect Red for broken physical transmons
        },
        text: {
          primary: "#F8FAFC",    // Pure Quantum Crisp White
          secondary: "#94A3B8",  // Refined Slate Gray
          muted: "#64748B",      // Deep Sub-Kelvin Muted
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          glow: "rgba(0, 240, 255, 0.35)",
          gold: "rgba(229, 192, 123, 0.35)",
        }
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
        sans: ["var(--font-geist-sans)", "Inter", "sans-serif"],
      },
      boxShadow: {
        "cyan-glow": "0 0 35px -5px rgba(0, 240, 255, 0.35)",
        "gold-glow": "0 0 35px -5px rgba(229, 192, 123, 0.35)",
        "neural-glow": "0 0 35px -5px rgba(129, 140, 248, 0.35)",
        "card-cryo": "0 16px 40px -8px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
      }
    },
  },
  plugins: [],
};
export default config;
