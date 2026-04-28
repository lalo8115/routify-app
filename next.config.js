/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  env: {
    DATABASE_SOURCE: process.env.DATABASE_SOURCE,
  },
}

module.exports = nextConfig
