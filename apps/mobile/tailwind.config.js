/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Semantic tokens resolved from CSS variables in src/global.css —
        // this is what makes dark/light/system theming work at runtime.
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
          border: "var(--color-border)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          dim: "var(--color-ink-dim)",
          faint: "var(--color-ink-faint)",
        },
        accent: {
          DEFAULT: "#e10600",
          live: "#00c853",
          warn: "#ffb300",
        },
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
