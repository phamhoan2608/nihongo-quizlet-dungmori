/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
    ],
  },
  async redirects() {
    return [
      // Old URL /n5/1 → new URL /n5/vocab/1
      {
        source: "/:course(n\\d+)/:lesson(\\d+)",
        destination: "/:course/vocab/:lesson",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
