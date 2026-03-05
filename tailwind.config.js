/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // ← ★ここがApp.jsxを読み込むために必須です！
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
