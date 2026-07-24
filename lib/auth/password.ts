import bcrypt from "bcryptjs";

// Usamos bcryptjs (JS puro) en vez de bcrypt nativo: evita compilación con
// node-gyp y funciona sin fricción en la imagen Alpine de Docker.

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
