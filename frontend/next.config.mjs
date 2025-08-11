/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
      
      // Force socket.io-client to be treated as external for dynamic imports
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'socket.io-client': 'socket.io-client'
        });
      }
    }
    return config;
  },
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;
