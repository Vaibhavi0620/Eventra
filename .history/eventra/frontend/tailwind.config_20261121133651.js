/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: { lg: "2px", xl: "4px", "2xl": "6px", "3xl": "8px" },
      colors: {
        // Premium Web3 & Concert Ticketing Dark Palette
        bg: {
          primary: "#080808",   // Deep Black
          secondary: "#0D1020", // Dark Navy
          card: "none",      // Charcoal
          elevated: "#20263D",  // Secondary Surface
        },
        accent: {
          violet: "#8B5CF6",       // primary action
          violetHover: "#7C3AED",
          violetLight: "#A78BFA",
          cyan: "#55B8FF",         // selected / informational
          lime: "#B9FF00",         // security & verification only
        },
        text: {
          primary: "#F4F4F0",   // Off White
          secondary: "#9CA3AF", // Muted Grey
        },
        border: {
          muted: "#262D47",
        },
        status: {
          success: "#6EE7B7",
          warning: "#FBBF24",
          error: "#FB7185",
        },
      },
      fontFamily: {
        display: ["'Bebas Neue'", "'Anton'", "'Oswald'", "Impact", "sans-serif"],
        sans: ["'Inter'", "'Manrope'", "'DM Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "none",
      },
    },
  },
  plugins: [],
};
