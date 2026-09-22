import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Nodemailer opens raw TCP sockets and loads its own files at runtime, so it
  // is required natively instead of being bundled with the server code.
  serverExternalPackages: ['nodemailer'],
  turbopack: {
    // Pin the workspace root to this project. Without it Turbopack walks up the
    // tree and picks up an unrelated package-lock.json outside the repository.
    root: __dirname,
  },
};

export default nextConfig;
