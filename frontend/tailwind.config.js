/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        field: {
          dark: 'var(--color-field-dark)',
          panel: 'var(--color-panel-green)',
        },
        paper: {
          base: 'var(--color-paper-base)',
          muted: 'var(--color-paper-muted)',
        },
        turmeric: {
          DEFAULT: 'var(--color-turmeric)',
          hover: 'var(--color-turmeric-hover)',
          light: 'var(--color-turmeric-light)',
        },
        teal: {
          gram: 'var(--color-teal)',
          light: 'var(--color-teal-light)',
        },
        clay: {
          DEFAULT: 'var(--color-clay)',
          light: 'var(--color-clay-light)',
        },
        softgreen: {
          DEFAULT: 'var(--color-softgreen)',
          light: 'var(--color-softgreen-light)',
        },
        border: {
          subtle: 'var(--color-border)',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        hindi: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '3px',
        md: '4px',
      },
    },
  },
  plugins: [],
}
