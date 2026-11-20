import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070B14",
          900: "#0B1220",
          800: "#111A2E",
          700: "#1A2740",
          600: "#243352",
        },
        mist: {
          50: "#F6F4EF",
          100: "#EDE9E0",
          200: "#D9D3C7",
        },
        accent: {
          DEFAULT: "#2DD4BF",
          dim: "#0F766E",
          glow: "#5EEAD4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        'lift': "0 24px 60px -20px rgba(11, 18, 32, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
