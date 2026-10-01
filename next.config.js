import path from "path";

const nextConfig = {
  // Optimize static images by disabling Next.js server-side image optimization
  images: {
    domains: [],
    unoptimized: true,
  },
  // Output as a static HTML export (required for fully static deployments)
  output: "export",
  // Enable React strict mode for improved debugging and performance checks
  reactStrictMode: true,
  // Ensure all URLs end with a trailing slash (useful for static hosts)
  trailingSlash: true,
  // Custom Webpack alias for simpler imports using "@"
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(process.cwd());
    return config;
  },
};

export default nextConfig;
