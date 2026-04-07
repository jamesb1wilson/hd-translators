/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Native .node addon — must not be bundled (Next 14.2 has no serverExternalPackages).
      config.externals.push('swisseph');
    }
    return config;
  },
};

export default nextConfig;
