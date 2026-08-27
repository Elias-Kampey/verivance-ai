import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#0a0c0f",
        surface: "#12151a",
        "surface-raised": "#15181e",
        brand: "#ef1b24",
      },
    },
  },
  plugins: [],
};

export default config;
