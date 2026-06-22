import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper:  "rgb(var(--c-paper)  / <alpha-value>)",
        card:   "rgb(var(--c-card)   / <alpha-value>)",
        ink:    "rgb(var(--c-ink)    / <alpha-value>)",
        sub:    "rgb(var(--c-sub)    / <alpha-value>)",
        line:   "rgb(var(--c-line)   / <alpha-value>)",
        indigo: {
          DEFAULT: "rgb(var(--c-indigo)      / <alpha-value>)",
          soft:    "rgb(var(--c-indigo-soft) / <alpha-value>)",
          deep:    "rgb(var(--c-indigo-deep) / <alpha-value>)",
        },
        shu: {
          DEFAULT: "rgb(var(--c-shu)      / <alpha-value>)",
          soft:    "rgb(var(--c-shu-soft) / <alpha-value>)",
        },
        moss: "rgb(var(--c-moss) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        jp:   ['"Zen Maru Gothic"', '"Plus Jakarta Sans"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.04), 0 12px 32px -12px rgba(0,0,0,.12)",
        lift: "0 8px 24px -8px rgba(var(--c-indigo) / 0.35)",
      },
      keyframes: {
        stamp: {
          "0%":   { transform: "scale(2.4) rotate(-18deg)", opacity: "0" },
          "60%":  { transform: "scale(.92) rotate(-12deg)", opacity: "1" },
          "100%": { transform: "scale(1)   rotate(-12deg)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to:   { transform: "translateY(0)",   opacity: "1" },
        },
      },
      animation: {
        stamp:      "stamp .45s cubic-bezier(.2,.8,.3,1) forwards",
        "slide-up": "slide-up .3s ease forwards",
      },
    },
  },
  plugins: [],
};
export default config;
