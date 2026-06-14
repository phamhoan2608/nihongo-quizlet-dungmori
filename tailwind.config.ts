import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        card: "#FFFFFF",
        ink: "#1B1A20",
        sub: "#6E6C77",
        line: "#E4E2DC",
        indigo: {
          DEFAULT: "#2C3A8C",
          soft: "#EAECF7",
          deep: "#202C6E",
        },
        shu: {
          DEFAULT: "#D9432F",
          soft: "#FBEAE6",
        },
        moss: "#3E7C5A",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        jp: ['"Zen Maru Gothic"', '"Plus Jakarta Sans"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,26,32,.04), 0 12px 32px -12px rgba(27,26,32,.18)",
        lift: "0 8px 24px -8px rgba(44,58,140,.35)",
      },
      keyframes: {
        stamp: {
          "0%": { transform: "scale(2.4) rotate(-18deg)", opacity: "0" },
          "60%": { transform: "scale(.92) rotate(-12deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-12deg)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        stamp: "stamp .45s cubic-bezier(.2,.8,.3,1) forwards",
        "slide-up": "slide-up .3s ease forwards",
      },
    },
  },
  plugins: [],
};
export default config;
