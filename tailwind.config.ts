import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // Custom industrial color palette
        industrial: {
          blue: '#0066CC',
          charcoal: '#1A1A1A',
          teal: '#00D4AA',
          amber: '#FF8C00',
          red: '#FF4444',
          deep: '#0F0F0F',
          gray: {
            50: '#F8F9FA',
            100: '#E9ECEF',
            200: '#DEE2E6',
            300: '#CED4DA',
            400: '#ADB5BD',
            500: '#6C757D',
            600: '#495057',
            700: '#343A40',
            800: '#212529',
            900: '#1A1A1A',
          }
        },
        // Override default shadcn colors for industrial theme
        background: '#0F0F0F',
        foreground: '#FFFFFF',
        card: {
          DEFAULT: '#1A1A1A',
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#1A1A1A',
          foreground: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#0066CC',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#343A40',
          foreground: '#E0E0E0',
        },
        muted: {
          DEFAULT: '#212529',
          foreground: '#ADB5BD',
        },
        accent: {
          DEFAULT: '#00D4AA',
          foreground: '#0F0F0F',
        },
        destructive: {
          DEFAULT: '#FF4444',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#FF8C00',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#00D4AA',
          foreground: '#0F0F0F',
        },
        border: '#343A40',
        input: '#212529',
        ring: '#0066CC',
        chart: {
          '1': '#0066CC',
          '2': '#00D4AA',
          '3': '#FF8C00',
          '4': '#FF4444',
          '5': '#6C757D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 5px rgba(0, 212, 170, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 15px rgba(0, 212, 170, 0.8)' },
        },
        'status-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0.3' },
        },
        'data-flow': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'status-blink': 'status-blink 1s ease-in-out infinite',
        'data-flow': 'data-flow 3s linear infinite',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
