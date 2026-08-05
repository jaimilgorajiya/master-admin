/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0F172A',
          dark: '#020617',
          light: '#1E293B',
        },
        cyan: {
          DEFAULT: '#00C8FF',
          glow: 'rgba(0, 200, 255, 0.5)',
        },
        purple: {
          DEFAULT: '#A855F7',
          neon: '#9333EA',
          glow: 'rgba(168, 85, 247, 0.5)',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
        }
      },
      fontFamily: {
        inter: ['Inter'],
        outfit: ['Outfit'],
      },
    },
  },
  plugins: [],
}
