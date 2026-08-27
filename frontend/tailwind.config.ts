import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0f1f3d",
          800: "#152a52",
          700: "#1d3868",
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          600: "#475569",
        },
      },
    },
  },
  plugins: [],
};

export default config;
