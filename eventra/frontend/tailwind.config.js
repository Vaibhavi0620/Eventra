/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: { lg: "10px", xl: "14px", "2xl": "20px", "3xl": "26px" },
      colors: {
        // Deep Ocean + Ice palette. Legacy names remain so existing JSX keeps working.
        bg: { primary: "#0B1720", secondary: "#10232D", card: "#17313D", elevated: "#214553" },
        accent: {
          violet: "#62D9E8", violetHover: "#39B9CE", violetLight: "#A8F1F2",
          cyan: "#8BE7EE", lime: "#7BA7FF"
        },
        text: { primary: "#F1FAFC", secondary: "#A9C0C8" },
        border: { muted: "#2C4B58" },
        status: { success: "#70DDB5", warning: "#A8C7FF", error: "#FF718A" },
      },
      fontFamily: {
        display: ["'Manrope'", "'DM Sans'", "sans-serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: { card: "0 12px 32px rgb(0 0 0 / 18%)" },
    },
  },
  plugins: [],
};
