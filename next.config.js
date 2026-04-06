/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Native modules — exclude from webpack bundling
  serverExternalPackages: ['better-sqlite3', 'pg'],
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
}
module.exports = nextConfig
