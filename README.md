# Rimay

Rimay es un agente de atención al cliente configurable para pymes (piloto: restaurantes y pollerías). La idea es que el dueño del negocio configure su agente en lenguaje de negocio, sin ver código ni prompts. El agente responde únicamente con lo que se registró en el catálogo y las reglas del negocio.

> **MVP visual/mock, sin backend ni IA real** — pensado para demo y validación de producto. No hay LLM, ni conexiones a WhatsApp/Instagram/pagos, ni persistencia real: el estado vive en el `BusinessContext` de React durante la sesión.

## Stack

Next.js (App Router) + TypeScript + Tailwind. Sin backend separado: todo vive en `/app` y `/app/api`.

## Páginas y qué simulan

| Ruta | Qué es | Qué simula |
| --- | --- | --- |
| `/` | Landing de bienvenida | Presentación de marca y punto de entrada al onboarding. |
| `/onboarding` | Elección de rubro | Precarga un catálogo y reglas de ejemplo según el rubro elegido. |
| `/portal` | Configuración del agente | El dueño edita nombre, tono, canales, catálogo y reglas. El "Guardar" muestra feedback visual, no persiste. |
| `/sandbox` | Prueba del chat | Conversación con el agente mock: coincidencia de texto contra el catálogo. Los pedidos confirmados y los mensajes no reconocidos se escalan al inbox. |
| `/inbox` | Panel operativo | Conversaciones entrantes (pedidos y casos que requieren revisión humana) con métricas simuladas. |
| `/resumen` | Dashboard de impacto | Tarjetas con métricas simuladas del valor que aporta el agente, según el rubro. |
| `/widget` | Widget embebible | Burbuja de chat que un negocio podría incrustar en su web; incluye handoff a operador (mock). |
| `/demo-cliente` | Sitio de ejemplo | Página ficticia de "El Pato Feliz" con el widget embebido, simulando la vista del cliente final. |

## Cómo la "inteligencia" del agente funciona (mock)

No hay ningún modelo de lenguaje detrás. La lógica del agente (`lib/mockAgent.ts`) hace coincidencia simple de texto contra el catálogo configurado:

- Si reconoce ítems del catálogo, arma una respuesta con precios y un resumen de pedido.
- Si el mensaje toca una palabra sensible (descuentos, reclamos, etc.), marca `needs_human_review`.
- Si no reconoce nada, marca `sinCoincidencia` y el sandbox escala la conversación al inbox como "Requiere revisión".

Toda respuesta con precio o pedido sale de esa coincidencia contra el catálogo, nunca de generación libre.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
```
