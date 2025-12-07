/** @type {import('next').NextConfig} */
const nextConfig = {
  turbo: {
    enabled: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
