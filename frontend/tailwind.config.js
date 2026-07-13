/** @type {import('tailwindcss').Config} */
// Tailwind v3 (pinned). Design tokens from docs/SPEC.md §4. Two palettes: light
// (default) and dark (class strategy). Headings use Google Sans (SIL OFL, replacing
// the proprietary Product Sans); body uses Roboto/Noto Sans. Load the fonts locally
// (self-hosted, no external CSS request) when the UI phase implements them.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'Noto Sans', 'system-ui', 'sans-serif'],
        heading: ['"Google Sans"', 'Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: {
          light: '#F8F9FA',
          dark: '#1F1F1F',
        },
        slate: {
          accent: '#3C4043',
        },
        trail: {
          // Emerald active-path green. NOTE: #0F9D58 on #F8F9FA is ~3.5:1 — do NOT
          // use it for small text (fails WCAG AA); it is a path/graphic color.
          green: '#0F9D58',
        },
        waypoint: {
          indigo: '#4285F4',
        },
        hazard: {
          // Always pair with an icon/label — never encode hazard by color alone.
          coral: '#EA4335',
        },
      },
      boxShadow: {
        fab: '0 1px 3px rgba(60,64,67,0.3), 0 4px 8px rgba(60,64,67,0.15)',
      },
    },
  },
  plugins: [],
};
