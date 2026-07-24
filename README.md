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

## Docker (desarrollo local con Postgres)

La app se puede levantar dentro de Docker junto a una instancia de Postgres, ambos con un solo comando.

1. Copia la plantilla de variables de entorno:

   ```bash
   cp .env.example .env
   ```

2. Levanta todo (construye la imagen de la app y arranca Postgres):

   ```bash
   docker compose up --build
   ```

3. Verifica que la app responde abriendo [http://localhost:3000](http://localhost:3000). Debería comportarse igual que con `npm run dev` (onboarding, portal, sandbox e inbox navegables).

Los datos de Postgres persisten en un volumen nombrado (`postgres_data`): si haces `docker compose down` y luego `docker compose up` de nuevo, la base se conserva. Solo `docker compose down -v` borra el volumen.

> **Nota:** en esta etapa Postgres queda levantado, saludable y disponible en `localhost:5432`, pero **la app todavía no lo usa**. La migración de la persistencia real (config del negocio y conversaciones) a Postgres es la siguiente tarea del roadmap. La variable `DATABASE_URL` ya queda definida en `.env` para que esa tarea la consuma directamente.

## Base de datos (Prisma + Postgres)

El modelo de datos multi-tenant vive en `prisma/schema.prisma` (una sola base de datos con `tenant_id` en cada tabla de negocio). El cliente reutilizable está en `lib/db.ts`.

> En esta etapa el esquema, las migraciones y el cliente quedan listos, pero **la app todavía no los usa**: `BusinessContext` y `conversationStore` siguen en memoria. La conexión real es la siguiente tarea del roadmap.

### Correr migraciones y seed contra el Postgres de Docker

La forma reproducible (y equivalente a lo que hará CI/CD) es correr Prisma **dentro de la red de Docker**, usando el host `postgres` del `docker-compose`. Con el contenedor de Postgres arriba (`docker compose up -d postgres`):

```bash
docker run --rm --network rimay-app_rimay \
  -v "$PWD:/app" -w /app \
  -e DATABASE_URL="postgresql://rimay:rimay_local_password@postgres:5432/rimay" \
  node:18-slim sh -lc "npx prisma migrate deploy && npx prisma db seed"
```

Los scripts equivalentes en `package.json` (`npm run db:migrate`, `db:seed`, `db:generate`) leen `DATABASE_URL` del entorno, pensados para el pipeline y AWS.

> **Nota de red local:** si corrés Prisma directamente desde el host (`npm run db:migrate`) y tu WSL/Docker no expone el contenedor en `localhost` (por ejemplo si ya tenés otro Postgres ocupando el 5432), usá el comando de arriba dentro de la red de Docker, que no depende de la red del host.

El seed crea un tenant de ejemplo (**Sabores del Valle**, rubro restaurante) con 4 ítems de catálogo y 2 reglas, replicando los datos mock del rubro restaurante.

## Autenticación (login por negocio)

El panel (`/portal`, `/sandbox`, `/inbox`, `/onboarding`) requiere iniciar sesión. La landing (`/`) es pública.

**Credenciales del usuario de desarrollo** (creado por el seed):

- Correo: `dueno@saboresdelvalle.pe`
- Contraseña: `rimay1234`

Ingresá en [http://localhost:3000/login](http://localhost:3000/login). Un login exitoso lleva al Portal (o al Onboarding si el negocio todavía no tiene catálogo).

### Cómo funciona la sesión

Se eligió **JWT firmado con `jose` guardado en una cookie httpOnly**, en vez de NextAuth, porque:

- Es liviano y no necesita adaptador ni tabla de sesiones en la base de datos.
- `jose` funciona tanto en el runtime Node (route handlers) como en el Edge (middleware), así que el mismo mecanismo protege las páginas (en `middleware.ts`) y valida las rutas API.
- El alcance actual (un dueño, una cuenta, un tenant) no justifica el peso de NextAuth.

La sesión guarda `userId` y `tenantId`; cada ruta API lee el `tenantId` de la sesión (ya no hay "tenant fijo" hardcodeado). Las contraseñas se hashean con `bcryptjs`.

> El secreto de firma se configura en `SESSION_SECRET` (ver `.env.example`). En el piloto local la cookie va sin `secure` porque corre sobre `http://localhost`; detrás de HTTPS debe activarse `secure`.
