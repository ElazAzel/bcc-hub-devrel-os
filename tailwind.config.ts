import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bcc: {
          violet: "#8934F9",
          deep: "#4C04A5",
          lilac: "#DEC4FF",
          cyan: "#B6F3F5",
          ink: "#1D1D1D",
          border: "#E8E7EC",
          soft: "#F4F5F8"
        }
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,.06)",
        popover: "0 18px 55px rgba(38,11,62,.12)"
      },
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px"
      }
    }
  },
  plugins: []
};

export default config;
