/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        earthy: {
          ebony: '#5F6556',
          charcoal: '#433F3E',
          graphite: '#292825',
          evergreen: '#1B2413',
          black: '#080809',
        },
      },
    },
  },
  plugins: [],
}
