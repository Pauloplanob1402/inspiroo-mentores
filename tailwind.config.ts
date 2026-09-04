import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E1726",
        panel: "#2A2035",
        paper: "#F7F1E6",
        marigold: "#F2A93B",
        teal: "#4FB6A6",
        dim: "#A79BB0",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
export default config;
