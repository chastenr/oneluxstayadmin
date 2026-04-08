export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#f6f3ee',
        ink: '#171717',
        sand: '#e9ddcf',
      },
      boxShadow: {
        panel: '0 24px 70px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
