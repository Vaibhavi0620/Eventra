/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: { lg: "10px", xl: "14px", "2xl": "20px", "3xl": "26px" },
      colors: {
        // Premium Web3 & Concert Ticketing Dark Palette
        bg: { primary: "#101D20", secondary: "#17292D", card: "#1D3438", elevated: "#28464A" },
        accent: {
          violet: "#FF8066", violetHover: "#F16D55", violetLight: "#FFA18E",
          cyan: "#55D6C2", lime: "#F5C96A"
        },
        text: {
          primary: "#FFF7E9", secondary: "#B8C9C5"
        },
        border: {
          muted: "#36565A",
        },
        status: {
          success: "#6EE7B7",
          warning: "#FBBF24",
          error: "#FB7185",
        },
      },
      fontFamily: {
        display: ["'Manrope'", "'DM Sans'", "sans-serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "none",
      },
    },
  },
  plugins: [],
};
