# Yakuman Soul API

Elysia on Bun, with SQLite persistence through **Drizzle ORM** and its `bun:sqlite` adapter. The backend owns the yakuman catalog, validates records, manages accounts/sessions, and serves JSON. It does not import frontend files.

## Setup

Run these commands from `backend/`:

```sh
bun install
# Optional: copy .env.example to .env to change configuration
bun run dev
```

The API listens on **http://localhost:11000**. Start the React + Vite frontend separately from `frontend/` on **http://localhost:5173**.

## Commands

```sh
bun run typecheck
bun test
bun start
bun run seed
bun run db:generate
bun run db:migrate
```

`seed` is optional: it adds three clearly labeled sample players and six records only if the database has no users. Sample accounts have inaccessible random passwords. Tests use in-memory or temporary databases and do not start a server.

## Database schema and migrations

- `src/schema.ts`: typed Drizzle tables, indexes, defaults, JSON arrays, and boolean mappings.
- `src/database.ts`: Bun SQLite connection and Drizzle migration runner.
- `src/db.ts`: application database instance and typed public record queries.
- `drizzle.config.ts`: Drizzle Kit configuration.
- `drizzle/`: committed SQL migrations, schema snapshots, and migration journal.

Pending migrations are applied automatically before API requests or seeding. `bun run db:migrate` applies them without starting the API. Run commands from `backend/` so Bun loads this folder's `.env`.

The initial migration uses `CREATE ... IF NOT EXISTS` to adopt the existing pre-Drizzle database in place. Existing users, password hashes, sessions, records, screenshots, and avatars are retained. Drizzle stores its migration history in `__drizzle_migrations`. The SQLite file location and JSON API remain the same.

For subsequent schema changes, edit `src/schema.ts`, run `bun run db:generate`, review the generated SQL, and commit the schema and migration files together. Use `bun run db:migrate` to apply those migrations. Keep the initial baseline migration unchanged after deployment.

## API

- `GET /api/health`: health status.
- `GET /api/catalog`: supported yakuman metadata and tile IDs, consumed by the frontend.
- `GET /api/posts`: public records; optional `user`, `type`, and `platform` filters.
- `GET /api/stats`: community totals and leaderboards.
- `GET /api/users/:id`: public player profile.
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`: cookie-based sessions.
- `POST /api/posts`, `DELETE /api/posts/:id`, `PATCH /api/profile`: authenticated mutations.

## Configuration and storage

Use this folder's `.env`; see `.env.example`. `APP_ORIGIN` must match the frontend origin. `COOKIE_SECURE=true` is intended for HTTPS deployments.

SQLite data stays in `data/yakuman.sqlite` unless `DATABASE_PATH` specifies another path. Uploaded screenshots and avatars are stored with the records. The data folder and environment files are ignored by Git. Back up the database with SQLite's backup API or a consistent snapshot of its database/WAL files.

For deployment, run this API behind your web server's `/api/` reverse proxy. The frontend is built and deployed independently.

## VPS deployment with Docker Compose and Traefik

The included `Dockerfile` and `docker-compose.yml` use Bun 1.3.5, install locked production dependencies, and include the Drizzle migrations. The service joins your existing external **`elysia-network`** and uses Traefik's **`websecure`** entrypoint and **`myresolver`** certificate resolver.

Traffic flows as follows:

```text
Browser → Vercel frontend /api/*
        → https://yakuman.elysiavernight.com/api/*
        → Traefik → yakuman-backend:11000
        → /app/data/yakuman.sqlite
```

Port 11000 is exposed only on the Docker network. Traefik handles public HTTPS on port 443.

### First deployment

1. Point the DNS `A` record for `yakuman.elysiavernight.com` to your VPS. If you publish an `AAAA` record, it must point to working IPv6 on that VPS too.
2. Upload or clone the backend into a directory such as `~/yakuman-backend`. Run the commands below **from that backend directory**:

   ```sh
   cp .env.production.example .env.production
   mkdir -p data
   id -u
   id -g
   ```

3. Edit `.env.production`:

   ```dotenv
   APP_ORIGIN=https://your-project.vercel.app
   APP_UID=1000
   APP_GID=1000
   ```

   Replace `APP_ORIGIN` with the exact production frontend origin, without a trailing slash. Set `APP_UID` and `APP_GID` to the values printed above. The container runs with those IDs so it can write to your `data/` folder.

4. Confirm the existing Docker network is available, then build and start:

   ```sh
   docker network inspect elysia-network
   docker compose --env-file .env.production config --quiet
   docker compose --env-file .env.production up -d --build
   docker compose --env-file .env.production ps
   docker compose --env-file .env.production logs --tail=100 yakuman-backend
   curl --fail https://yakuman.elysiavernight.com/api/health
   ```

   Health returns `{"ok":true}`. Database migrations run automatically at startup. A new database starts empty; sample profiles are never seeded by the container.

5. Deploy the frontend on Vercel with its included `vercel.json`. Check `https://YOUR-FRONTEND-DOMAIN/api/health`, then log in and reload to verify cookies. The Vercel rewrite preserves the existing same-origin `/api` frontend requests. Keep `COOKIE_SECURE=true` (already set in Compose) and `SameSite=Lax`.

### Preserve your current Rycene account and record

The image excludes local databases. The VPS uses `./data/yakuman.sqlite`, mounted persistently at `/app/data/yakuman.sqlite`; rebuilding or replacing the container keeps this data.

To move the existing local database, create a consistent SQLite snapshot on your development machine from `backend/`:

```sh
bun -e 'import { Database } from "bun:sqlite"; import { databasePath } from "./src/database"; const db = new Database(databasePath(), { readonly: true }); try { db.query("VACUUM INTO ?").run("yakuman-transfer.sqlite"); } finally { db.close(); }'
```

The destination file must not already exist. Upload `yakuman-transfer.sqlite` to the VPS as `~/yakuman-backend/data/yakuman.sqlite` **before the first container start**. This preserves your users, password hashes, records, avatars, screenshots, and sessions. Remove the transfer file after confirming the deployment; do not commit it. Copying a live SQLite main file alone can miss data in its WAL, so use the snapshot above.

### Updates and backups

Back up before deploying schema changes. This creates a consistent snapshot inside the mounted `data/backups/` directory:

```sh
docker compose --env-file .env.production exec yakuman-backend bun -e 'import { Database } from "bun:sqlite"; import { mkdirSync } from "node:fs"; mkdirSync("/app/data/backups", { recursive: true }); const path = `/app/data/backups/yakuman-${Date.now()}.sqlite`; const db = new Database(process.env.DATABASE_PATH, { readonly: true }); try { db.query("VACUUM INTO ?").run(path); console.log(path); } finally { db.close(); }'
docker compose --env-file .env.production up -d --build
```

Copy backups off the VPS as well. `docker compose down` stops/removes the container but leaves the bind-mounted `data/` folder intact. Do not replace the VPS database with a development copy during routine updates.
