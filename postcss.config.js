module.exports = {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    '@fullhuman/postcss-purgecss': {
      content: ['./components/**/*.{js,jsx,ts,tsx}', './pages/**/*.{js,jsx,ts,tsx}'],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
    },
    'postcss-preset-env': {},
  }
};
