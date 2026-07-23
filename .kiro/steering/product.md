# Rimay

Producto: agente de atención al cliente configurable para pymes (piloto: restaurantes/pollerías).

Objetivo: que el dueño del negocio configure su agente en lenguaje de negocio, sin ver código ni prompts.

## Stack

Next.js (App Router) + TypeScript + Tailwind. Sin backend separado: todo vive en /app/api.

## Reglas no negociables

- La IA NUNCA inventa precios, ítems del menú, ni políticas fuera de data/catalog.json.

- Toda respuesta con precio o pedido debe salir de function calling contra el catálogo, nunca de generación libre.

- La salida de un pedido siempre es JSON estructurado (ver lib/types.ts), nunca texto libre suelto.

- Si el cliente pide algo que no está en el catálogo o rompe una regla, la respuesta debe marcar

  needs_human_review: true en vez de intentar resolverlo sola.

## Convenciones

- Componentes en español donde el texto es de cara al usuario final (dueño o cliente).

- Nombres de variables y funciones en inglés.

- Cada feature nueva = un spec separado, no specs gigantes.
