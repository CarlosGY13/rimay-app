/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un servidor autocontenido en .next/standalone para una imagen
  // Docker liviana (lista para ECR/ECS Fargate más adelante).
  output: "standalone",
};

module.exports = nextConfig;
