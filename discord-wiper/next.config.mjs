import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a subdirectory of a larger repo; pin the tracing root so
  // Next.js does not get confused by the other lockfile at the repo root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
