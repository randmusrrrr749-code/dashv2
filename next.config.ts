

/*
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  ...(isProd
    ? {
        basePath: "/panel",   // only in production
        assetPrefix: "/panel" // only in production
      }
    : {}),
};

export default nextConfig;


import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // ✅ Generate a fully static export (no Node server needed)
  output: "export",

  // ✅ Disable Next.js image optimization (required for static builds)
  images: {
    unoptimized: true,
  },

  // ✅ Optional: ensure clean static paths & no asset 404s
  trailingSlash: true,

  // ✅ Environment-specific configuration
  ...(isProd
    ? {
        // When deployed to yoursite.com/panel
        basePath: "/panel",
        assetPrefix: "/panel/",
      }
    : {}),
  
  // ✅ Optional: ensures consistent build behavior across environments
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;



import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",

  images: {
    unoptimized: true,
  },

  trailingSlash: true,

  eslint: {
    ignoreDuringBuilds: true, // ⬅ disables linting errors on build
  },

  ...(isProd
    ? {
        basePath: "/panel",
        assetPrefix: "/panel/",
      }
    : {}),

  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
*/

import type { NextConfig } from "next";

const nextConfig: NextConfig = {


  // optional but common:
  reactStrictMode: true,

 
};

export default nextConfig;
