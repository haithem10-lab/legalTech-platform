import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: "#44645D", hover: "#374F49" },
        paper:    "#FBF8F2",
        canvas:   "#F3F1EC",
        ink:      "#1C2127",
        body2:    "#3A4049",
        muted:    "#8A8270",
        line: { DEFAULT: "#C9C2B4", light: "#E0D9CB", divider: "#EDE8DD", faint: "#F1ECE1" },
        success:  { DEFAULT: "#44645D", bg: "#E6F0EA", border: "#BCD9C8", text2: "#3A6B57" },
        danger:   { DEFAULT: "#B23A2E", bg: "#F6E5E2", border: "#E2BBB4" },
        draft:    { bg: "#F3EDD9", border: "#E2D7B0", text: "#8A6D1F", dot: "#B8902E" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans:  ["var(--font-sans)", "system-ui", "sans-serif"],
        mono:  ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "4px", sm: "6px", md: "8px", lg: "10px",
        xl: "12px", "2xl": "14px", pill: "20px",
      },
      boxShadow: {
        sm:    "0 1px 2px rgba(28,33,39,0.12)",
        xs:    "0 1px 2px rgba(28,33,39,0.06)",
        card:  "0 8px 28px rgba(28,33,39,0.08)",
        hover: "0 6px 20px rgba(28,33,39,0.09)",
        modal: "0 24px 70px rgba(28,33,39,0.35)",
      },
      maxWidth: { content: "1100px", form: "560px" },
    },
  },
  plugins: [],
};
export default config;
