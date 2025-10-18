export default {
  content: [
    './public/**/*.html',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        yellow: {
          400: '#FFD54F',
          300: '#f7c63a'
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
