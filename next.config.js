/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    dirs: ['src'],
  },
};

module.exports = nextConfig;
