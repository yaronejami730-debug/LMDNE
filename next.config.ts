import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Autorise l'accès dev depuis le réseau local + tunnel (sinon server actions bloquées)
  allowedDevOrigins: [
    "192.168.1.151",
    "*.trycloudflare.com",
    "must-fame-chair-sudden.trycloudflare.com",
  ],
};

export default nextConfig;
