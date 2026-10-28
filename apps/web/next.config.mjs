/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@scamguard/shared', '@scamguard/risk-engine'],
  poweredByHeader: false,
};

export default nextConfig;
