import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1340",      // deep indigo text and outlines
        paper: "#F3F1FF",    // pale lilac page background
        violet: "#5B3DF5",   // primary actions
        gold: "#FFC21A",     // XP and rewards
        mint: "#13A36B",     // correct answers
        coral: "#E5484D",    // wrong answers and errors
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        chunky: "4px 4px 0 0 #1B1340",
        "chunky-sm": "2px 2px 0 0 #1B1340",
      },
    },
  },
  plugins: [],
};
export default config;
