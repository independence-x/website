import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/clients.html", destination: "/clients", permanent: false },
      { source: "/contact-us.html", destination: "/contact", permanent: false },
      { source: "/funding.html", destination: "/funding", permanent: false },
      { source: "/awards.html", destination: "/awards", permanent: false },
      { source: "/media.html", destination: "/media", permanent: false },
      { source: "/store.html", destination: "/store", permanent: false },
    ];
  },
};

export default nextConfig;
