/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      if (Array.isArray(config.externals)) {
        config.externals.push({ canvas: 'canvas' });
      }
    }

    return config;
  },
};

module.exports = nextConfig;
