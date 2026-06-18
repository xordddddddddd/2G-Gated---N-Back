import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          bg: "#0b0d12",
          panel: "#13161d",
          border: "#1f2330",
          accent: "#5865F2",
          danger: "#ed4245",
          ok: "#23a55a",
          muted: "#9aa3b2",
        },
      },
    },
  },
  plugins: [],
};

export default config;
