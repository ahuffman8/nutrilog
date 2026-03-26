/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native modules — exclude from webpack bundling
  serverExternalPackages: ['better-sqlite3', 'pg'],
}
module.exports = nextConfig
