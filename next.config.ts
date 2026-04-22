import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Dev: allow HMR when the browser host does not match the dev server host (e.g. 127.0.0.1 vs localhost, or VPN/LAN IP). */
  allowedDevOrigins: ["127.0.0.1", "198.18.7.72", "localhost"],
};

export default nextConfig;
