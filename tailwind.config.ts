import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        muted: "#64727f",
        panel: "#ffffff",
        line: "#e6ebef",
        accent: "#0f766e",
        signal: "#2563eb"
      },
      boxShadow: {
        panel: "0 14px 35px rgba(23, 32, 38, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
