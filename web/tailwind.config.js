/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Original Theme
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
        error: "#ba1a1a",
        
        // Template Analytics Theme
        "on-primary-fixed": "#001f24",
        "primary-fixed-dim": "#54d7ec",
        "on-tertiary-container": "#4c3129",
        "secondary": "#346572",
        "surface-container-high": "#ece8dd",
        "primary": "#006875",
        "error-container": "#ffdad6",
        "surface-bright": "#fef9ee",
        "inverse-surface": "#323029",
        "on-secondary-fixed": "#001f26",
        "secondary-fixed-dim": "#9dcedd",
        "on-tertiary": "#ffffff",
        "surface-dim": "#dedacf",
        "surface-container-highest": "#e7e2d7",
        "on-secondary": "#ffffff",
        "on-tertiary-fixed-variant": "#5d4037",
        "tertiary-fixed": "#ffdbd0",
        "on-primary-fixed-variant": "#004f58",
        "inverse-on-surface": "#f5f0e5",
        "outline": "#6d797c",
        "primary-fixed": "#9cf0ff",
        "on-surface-variant": "#3d494b",
        "inverse-primary": "#54d7ec",
        "on-primary": "#ffffff",
        "on-background": "#1d1c15",
        "on-primary-container": "#003e46",
        "surface-container-low": "#f8f3e8",
        "tertiary-container": "#bf998d",
        "tertiary-fixed-dim": "#e7bdb1",
        "on-error": "#ffffff",
        "secondary-fixed": "#b9ebf9",
        "outline-variant": "#bcc9cc",
        "on-secondary-fixed-variant": "#184d59",
        "surface-container-lowest": "#ffffff",
        "primary-container": "#12b1c5",
        "surface-variant": "#e7e2d7",
        "on-secondary-container": "#386976",
        "on-tertiary-fixed": "#2c160e",
        "on-surface": "#1d1c15",
        "on-error-container": "#93000a",
        "tertiary": "#77574d",
        "secondary-container": "#b6e8f6",
        "surface-container": "#f2ede3",
        "surface-tint": "#006875"
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        "headline-lg": ["Hanken Grotesk", "sans-serif"],
        "headline-xl": ["Hanken Grotesk", "sans-serif"],
        "body-md": ["Hanken Grotesk", "sans-serif"],
        "headline-md": ["Hanken Grotesk", "sans-serif"],
        "label-md": ["Hanken Grotesk", "sans-serif"]
      },
      fontSize: {
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-xl": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500" }]
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'typing': 'typing 1.5s steps(20, end) infinite',
        'steam': 'steam 2s infinite ease-in-out',
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        steam: {
          '0%': { transform: 'translateY(0) scaleX(1)', opacity: 0 },
          '15%': { opacity: 1 },
          '50%': { transform: 'translateY(-2px) scaleX(1.2)' },
          '95%': { opacity: 0 },
          '100%': { transform: 'translateY(-4px) scaleX(1)', opacity: 0 },
        }
      }
    },
  },
  plugins: [],
}
