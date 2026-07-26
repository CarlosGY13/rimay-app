# Rimay

Rimay es un agente de atención al cliente configurable para pymes (piloto: restaurantes y pollerías). El dueño del negocio configura su catálogo, reglas y tono desde un panel, en lenguaje natural, y un agente de IA atiende a los clientes respondiendo **solo** con lo que hay en ese catálogo.

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind**
- **PostgreSQL** + **Prisma**
- **IA**: OpenAI o Google Gemini (configurable por variable de entorno)
- Todo corre en **Docker**

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- Una API key de **OpenAI** o de **Gemini**

## Puesta en marcha

### 1. Variables de entorno

```bash
cp .env.example .env
```

Editá `.env` y completá:

- `AI_PROVIDER` → `openai` o `gemini`
- `OPENAI_API_KEY` **o** `GEMINI_API_KEY` (según el proveedor elegido)
- `SESSION_SECRET` → cualquier cadena larga y aleatoria (para firmar la sesión)

Las variables de Postgres ya vienen con valores por defecto que funcionan tal cual.

### 2. Levantar la app (modo desarrollo, con recarga en caliente)

```bash
docker compose -f docker-compose.dev.yml up
```

Instala dependencias, aplica las migraciones de la base y arranca el server en **http://localhost:3000**. Al guardar un archivo, los cambios se reflejan al instante (hot reload). La primera vez tarda un poco más porque instala dependencias.

### 3. Cargar datos de ejemplo (una sola vez)

En otra terminal, con la app corriendo:

```bash
docker compose -f docker-compose.dev.yml exec app npx prisma db seed
```

Crea un negocio de ejemplo ("Sabores del Valle") y un usuario para entrar.

### 4. Entrar

Abrí **http://localhost:3000/login** e ingresá con:

- Correo: `dueno@saboresdelvalle.pe`
- Contraseña: `rimay1234`

## Modos de correr

| Modo | Comando | Para qué |
| --- | --- | --- |
| Desarrollo (hot reload) | `docker compose -f docker-compose.dev.yml up` | Día a día. Cambios en vivo, sin rebuild. |
| Build de producción | `docker compose up --build` | Verificar la imagen optimizada antes de desplegar. |

> No corras los dos modos a la vez: ambos usan los puertos 3000 y 5432. Para cambiar de uno a otro, bajá el que esté corriendo (`docker compose down` o `docker compose -f docker-compose.dev.yml down`) y levantá el otro. Comparten el mismo volumen de datos de Postgres, así que la base se conserva.

## Variables de entorno

| Variable | Descripción | Default |
| --- | --- | --- |
| `AI_PROVIDER` | Proveedor de IA: `openai` o `gemini` | `openai` |
| `OPENAI_API_KEY` | API key de OpenAI (si usás `openai`) | — |
| `GEMINI_API_KEY` | API key de Gemini (si usás `gemini`) | — |
| `OPENAI_MODEL` / `GEMINI_MODEL` | Modelo a usar (opcional) | `gpt-4o-mini` / `gemini-2.5-flash` |
| `SESSION_SECRET` | Secreto para firmar la sesión (cadena larga aleatoria) | — |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales de Postgres | `rimay` / `rimay_local_password` / `rimay` |
| `DATABASE_URL` | Conexión a Postgres (herramientas locales) | apunta a `localhost:5432` |

> El plan gratuito de Gemini limita las requests por día; si empezás a ver respuestas genéricas ("Dame un momento…"), probablemente agotaste la cuota. Cambiar `AI_PROVIDER=openai` o esperar el reset lo soluciona.

## Cómo está organizado

**Panel del dueño** (requiere login):

- `/portal` — configura el negocio: catálogo, reglas y tono. Podés subir una foto de la carta y la IA extrae los platos y precios.
- `/sandbox` — probá el agente como si fueras un cliente.
- `/inbox` — conversaciones entrantes y casos que el agente escaló a una persona.
- `/resumen` — métricas de impacto del agente.

**Público** (cliente final): `/` (landing), `/widget` (burbuja de chat embebible) y `/demo-cliente` (sitio de ejemplo con el widget).

## Base de datos

El modelo vive en `prisma/schema.prisma` (multi-tenant: una sola base con `tenant_id` en cada tabla de negocio). En modo desarrollo las migraciones se aplican solas al levantar. Comandos útiles (dentro del contenedor con `docker compose -f docker-compose.dev.yml exec app ...`):

- `npx prisma migrate deploy` — aplica migraciones pendientes
- `npx prisma db seed` — carga los datos de ejemplo
- `npx prisma studio` — explorador visual de la base

## Integración con Telegram (opcional)

El agente puede atender por un bot de Telegram. Los mensajes del cliente pasan por el mismo motor de IA (con tu catálogo) y las conversaciones aparecen en el Inbox como canal **Telegram**; si el agente necesita ayuda, quedan para revisión y un operador puede tomarlas.

### 1. Crear el bot

En Telegram, hablale a [@BotFather](https://t.me/BotFather), enviá `/newbot`, seguí los pasos y copiá el **token** que te da.

### 2. Configurar el token

En `.env`:

```
TELEGRAM_BOT_TOKEN=<el token de BotFather>
TELEGRAM_WEBHOOK_SECRET=<una cadena aleatoria cualquiera>
```

Reiniciá la app para que tome las variables.

### 3. Exponer el webhook

Telegram necesita una URL pública HTTPS que apunte a `/api/telegram/webhook`.

- **En producción**: es directamente la URL de tu deploy, ej. `https://tu-dominio.com/api/telegram/webhook`.
- **En local**: levantá un túnel gratis a `localhost:3000`. Con [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/):

  ```bash
  cloudflared tunnel --url http://localhost:3000
  ```

  Te da una URL tipo `https://algo-al-azar.trycloudflare.com`.

### 4. Registrar el webhook en Telegram

Una sola vez (reemplazá el token, la URL y el secret):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL_PUBLICA>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Listo: escribile a tu bot en Telegram y debería responder con la info de tu catálogo. Las conversaciones aparecen en `/inbox`.

> El webhook valida el `secret_token` en cada request (header `x-telegram-bot-api-secret-token`), así nadie más puede dispararlo.
