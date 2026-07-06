import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./stores/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F0F0F",
        card: "#171717",
        primary: "#1972F7",
        border: "#2A2A2A",
        muted: "#A1A1AA"
      },
      borderRadius: {
        xl: "0.75rem"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(25, 114, 247, 0.28), 0 24px 80px rgba(0, 0, 0, 0.36)"
      }
    }
  },
  plugins: []
};

export default config;
