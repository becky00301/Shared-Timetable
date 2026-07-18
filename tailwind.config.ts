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
        background: "#ffffff",
        surface: "#f7f6f3",
        card: "#f7f7f5",
        foreground: "#37352f",
        primary: "#2383e2",
        border: "#e6e5e1",
        muted: "#787774"
      },
      borderRadius: {
        xl: "0.75rem"
      },
      boxShadow: {
        glow: "0 1px 2px rgba(15, 15, 15, 0.06), 0 10px 30px rgba(15, 15, 15, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
