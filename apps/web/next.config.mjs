/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@furniture-dataviz/parametric-engine',
    '@furniture-dataviz/ui-tokens'
  ]
};

export default nextConfig;
