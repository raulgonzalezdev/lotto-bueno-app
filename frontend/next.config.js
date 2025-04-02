// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     reactStrictMode: true,
//     // Elimina cualquier referencia a output: 'export'
//     // Otras configuraciones...
//   };
  
//   module.exports = nextConfig;
  

/** @type {import('next').NextConfig} */
const nextConfig = {
  "output": "export",
  env: {
    HOST: process.env.HOST
  }
};

// Set assetPrefix only in production/export mode
if (process.env.NODE_ENV === 'production') {
  nextConfig.assetPrefix = '/static';
}

module.exports = nextConfig;
