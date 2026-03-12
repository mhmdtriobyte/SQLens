import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for deployment without a Node.js server
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Enable trailing slashes for static hosting compatibility
  trailingSlash: true,

  // Webpack configuration for sql.js WASM support
  webpack: (config, { isServer }) => {
    // Don't attempt to bundle these Node.js modules on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };

      // Ignore node: scheme imports
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'node:fs': 'commonjs fs',
          'node:path': 'commonjs path',
          'node:crypto': 'commonjs crypto',
        });
      }
    }

    // Add rule for WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },

  // Turbopack config (replacing deprecated experimental.turbo)
  turbopack: {
    rules: {
      '*.wasm': {
        loaders: ['file-loader'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
