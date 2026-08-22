/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Design system tokens (spec section 57)
        surface: {
          DEFAULT: "#0B0E14",
          raised: "#141822",
          border: "#232A38",
        },
        ink: {
          DEFAULT: "#F2F5FA",
          dim: "#9AA5B5",
          faint: "#5B6675",
        },
        accent: {
          DEFAULT: "#E10600", // F1 red default; overridden per-sport at runtime
          live: "#00C853",
          warn: "#FFB300",
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
