// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable if needed
  },
  // Pastikan ini ada
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    domains: ['*.supabase.co'],
  },
  // Untuk mencegah error layout
  reactStrictMode: true,
}

module.exports = nextConfig
