/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  turbopack: {
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
