/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: { lg: "8px", xl: "12px", "2xl": "16px", "3xl": "20px" },
      colors: {
        bg: {
          primary: "#101512",
          secondary: "#171F1A",
          card: "#1D2821",
          elevated: "#26352B"
        },
        accent: {
          violet: "#C7E66A",
          violetHover: "#B4D653",
          violetLight: "#D8EF91",
          cyan: "#83B9A5",
          lime: "#C7E66A"
        },
        text: {
          primary: "#F2F0E8",
          secondary: "#A7B2A7"
        },
        border: { muted: "#344238" },
        status: {
          success: "#9BCB87",
          warning: "#E9BD68",
          error: "#E47F75"
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "'DM Sans'", "sans-serif"],
        sans: ["'DM Sans'", "'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        card: "0 8px 24px rgba(0, 0, 0, 0.16)"
      }
    }
  },
  plugins: []
};
