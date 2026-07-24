/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un servidor autocontenido en .next/standalone para una imagen
  // Docker liviana (lista para ECR/ECS Fargate más adelante).
  output: "standalone",
  experimental: {
    // Habilita instrumentation.ts para validar configuración al arrancar.
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
