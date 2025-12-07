/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Ignore TypeScript errors during production builds (Vercel)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Ignore ESLint errors during production builds (we already needed this)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

module.exports = nextConfig;
