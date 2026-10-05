/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4f6f4',
          100: '#e5e9e5',
          200: '#ccd4cd',
          300: '#a7b6a9',
          400: '#7f9382',
          500: '#607264', // Color primario de marca
          600: '#4d5d51',
          700: '#3f4b42',
          800: '#353e37',
          900: '#2d342f',
          950: '#171c18',
        },
        sand: {
          50: '#fbfaf8',
          100: '#f5f2ec',
          200: '#eae4d7',
          300: '#ddd2be',
          400: '#cbbba0',
          500: '#bca686',
        },
        charcoal: {
          DEFAULT: '#22252A',
          muted: '#686D76',
        },
        terra: {
          DEFAULT: '#D97757',
          light: '#FDF3EE',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
