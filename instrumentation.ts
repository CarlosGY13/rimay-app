// Se ejecuta una vez al arrancar el servidor (Next instrumentation hook).
// Validamos acá la configuración del proveedor de IA para fallar de forma
// clara y temprana (al arrancar), en vez de en silencio a mitad de una
// conversación.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const supported = ["openai", "gemini"];
  const provider = process.env.AI_PROVIDER;

  if (!provider || !supported.includes(provider)) {
    throw new Error(
      `[Rimay] AI_PROVIDER inválido o ausente: "${provider ?? ""}". ` +
        `Valores soportados: ${supported
          .map((p) => `"${p}"`)
          .join(", ")}. Configuralo en el entorno antes de arrancar.`
    );
  }
}
