/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        foreground: '#F3F4F6',
        card: {
          DEFAULT: '#111827',
          border: '#1F2937'
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB'
        },
        accent: {
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          green: '#10B981',
          rose: '#F43F5E'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-accent': '0 0 20px rgba(139, 92, 246, 0.15)',
      }
    },
  },
  plugins: [],
}
