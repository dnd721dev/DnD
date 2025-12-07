/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // 👇 This is the important part
  eslint: {
    // Warning: This allows production builds to succeed
    // even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
