/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        surface: "#12121A",
        border: "#22222E",
        primary: "#7C3AED",
        secondary: "#06B6D4",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.15), transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(124,58,237,0.5), 0 0 60px rgba(124,58,237,0.2)",
        "glow-cyan": "0 0 20px rgba(6,182,212,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
