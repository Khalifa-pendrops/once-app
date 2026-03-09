/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // OLED Optimization
        background: "#000000",
        surface: "#121212",
        primary: "#FFFFFF",
        // Signal Colors
        safety: "#4ADE80", // Trust Green
        burn: "#EF4444",   // Danger/Expiraton Red
        muted: "#737373",
      },
      fontFamily: {
        mono: ["SpaceMono"],
      },
    },
  },
  plugins: [],
};
