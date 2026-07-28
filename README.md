<h1 align="center">Rimay</h1>
<p align="center">
  <img src="https://drive.google.com/thumbnail?id=11ajc1cBw8rbZjO0z_gWqApwImRLhUu2A&sz=w1000" alt="Rimay" width="180" />
</p>
<p align="center"><em>"Hablar" en quechua — un agente de atención al cliente con IA para pymes de comida.</em></p>

<p align="center">
  <a href="https://main.d39xfi82w5dpxo.amplifyapp.com"><strong>🔗 Ver demo en vivo</strong></a>
  ·
  <a href="https://www.youtube.com/watch?v=V0gKkWqEYWE"><strong>▶️ Ver video de presentación</strong></a>
</p>

---

## El problema

En Perú existen más de 13,000 pollerías (8,000 solo en Lima), y el peruano tiene el mayor consumo per cápita de pollo de Latinoamérica. Estos negocios reciben pedidos simultáneos por WhatsApp, Instagram, Facebook y web, pero operan con equipos muy chicos (un par de cocineros, algunos meseros) y no dan abasto para responder cada consulta — perdiendo clientes que estaban listos para comprar. Las apps de delivery tradicionales "resuelven" esto, pero cobran hasta 30% de comisión.

## La solución

**Rimay** le permite a cualquier pyme personalizar un agente de atención al cliente con IA **sin escribir una sola línea de código**: el dueño sube una foto de su carta (la IA extrae productos y precios automáticamente), define reglas de negocio en español simple, y el agente empieza a atender por chat web y Telegram, respondiendo únicamente con datos reales de su catálogo (sin alucinaciones). Cuando un caso no puede resolverse solo, escala a un operador humano en segundos.

---

## 🧪 Probar la demo

**URL:** [https://main.d39xfi82w5dpxo.amplifyapp.com](https://main.d39xfi82w5dpxo.amplifyapp.com)

**Credenciales del panel del dueño:**

| Campo | Valor |
|---|---|
| Correo | `dueno@saboresdelvalle.pe` |
| Contraseña | `rimay1234` |

> ⚠️ **Nota sobre la IA:** esta demo corre con una API key de Gemini de nivel gratuito, con límite de solicitudes por minuto. Si el agente responde con un mensaje genérico como *"Dame un momento…"*, es porque se alcanzó momentáneamente ese límite — se resuelve solo en menos de un minuto, sin ninguna acción adicional. Agradecemos reintentar pasado ese breve lapso.

### Qué vas a encontrar al entrar

| Sección | Qué hace |
|---|---|
| **`/portal`** | Panel del dueño: catálogo (con extracción automática desde foto), reglas de negocio en lenguaje natural, tono del agente, canales activos. |
| **`/sandbox`** | Probar al agente como si fueras un cliente, antes de exponerlo al público. |
| **`/inbox`** | Conversaciones entrantes (web + Telegram) y casos escalados a revisión humana. |
| **`/resumen`** | Métricas de impacto del agente. |

Recomendación de recorrido: entrá con las credenciales de arriba → mirá el catálogo en `/portal` → probá una conversación en `/sandbox` → si tenés Telegram, escribile al bot (te lo mostramos en el video) y mirá cómo aparece en `/inbox`.

---

## 🏗️ Arquitectura y stack

- **Next.js 14** (App Router) + **TypeScript** — monolito moderno, sin microservicios innecesarios.
- **PostgreSQL multi-tenant** (una sola base sirve múltiples negocios de forma aislada), gestionada con **Prisma**, hosteada en **Neon** (serverless, misma región de AWS).
- **IA intercambiable**: Gemini Flash u OpenAI GPT-4o-mini, configurable por variable de entorno. Todas las respuestas de catálogo se fuerzan a schemas JSON estrictos validados contra la base de datos — la IA no inventa productos ni precios.
- **Canales**: widget web embebible + bot de Telegram vía webhooks nativos.
- **Human-in-the-Loop**: fallback automático a un operador humano ante un caso no cubierto por las reglas, o ante timeout/anomalía de la IA.
- **Insight Engine**: analiza conversaciones con fricción y sugiere nuevas reglas de negocio al dueño, aprobables con un clic.

### AWS y Kiro

- Desplegado en producción sobre **AWS Amplify Hosting** (SSR de Next.js), con pipeline de CI/CD conectado directo a este repositorio de GitHub.
- Base de datos en **Neon (PostgreSQL)**, en la misma región de AWS (us-east-1).
- Todo el desarrollo fue acelerado de principio a fin con **Kiro**, usando su flujo de especificaciones estructuradas (*specs*) y archivos de orientación (*steering files*) para iterar rápido sin sacrificar calidad de código.

---

## 📚 Documentación técnica

Este README está pensado para evaluación del producto. Si querés levantar el proyecto en local, ver el modelo de datos completo, o entender la configuración de Docker, revisá **[DEVELOPMENT.md](DEVELOPMENT.md)**.

---

<p align="center"><em>Rimay le devuelve el control, el margen y la rapidez de atención a miles de pymes en Latinoamérica.</em></p>