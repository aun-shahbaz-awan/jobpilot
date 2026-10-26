import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "playwright", "nodemailer", "pdf-parse", "mammoth"],
};

export default nextConfig;
