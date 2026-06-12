/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF6F0",
        surface: "#FBF7F2",
        "surface-white": "#FFFFFF",
        border: "#EADFD2",
        text: "#2C211B",
        mocha: "#4A3525",
        "mocha-dark": "#1E1712",
        caramel: "#BE7E50",
        sage: "#8FA587",
        success: "#6FA471",
        warning: "#D69A52",
        error: "#C9695E",
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'typing': 'typing 1.5s steps(20, end) infinite',
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        }
      }
    },
  },
  plugins: [],
}
