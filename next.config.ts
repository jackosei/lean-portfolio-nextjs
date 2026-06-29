import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Screenshot thumbnails are served through our own /api/thumb proxy,
  // so no remote image domains need to be allow-listed here.
};

export default nextConfig;
