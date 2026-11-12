# Yakuman Soul API

A backend server for [Yakuman Soul](https://github.com/Elysiavernight/yakuman-tracker) written in Typescript with ElysiaJS and bun runtime


Tech stack : 
1. Typescript
2. ElysiaJS
3. Sqllite + Drizzle-orm


# Contributing
1. Clone this repository 
```https://github.com/Elysiavernight/yakuman-backend```
2. Install dependencies with ```bun install```
3. Run the server with ```bun run dev```
4. Server will be listening on ```localhost:11000```


This server will be updated to account for future features, bug fixes and security patches. if you have suggestion, feel free to open a pull request

## Production frontend and cookies

The Vercel frontend calls this API directly, without a Vercel rewrite. Credentialed CORS allows the exact `APP_ORIGIN` and supports JSON preflights for login, profile changes, and record mutations.

For `https://yakuman-tracker.vercel.app` calling `https://yakuman.elysiavernight.com`, use:

```dotenv
APP_ORIGIN=https://yakuman-tracker.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

Origins must not contain a trailing slash. In Docker Compose, secure cross-site cookies are already configured; set `APP_ORIGIN`, `APP_UID`, and `APP_GID` in the VPS `.env` and rebuild with:

```sh
docker compose up -d --build yakuman-backend
```

For the current VPS account, `APP_UID=1002` and `APP_GID=1002` match the owner of `data/`. The bind-mounted SQLite database is preserved when rebuilding.

For local HTTP development, keep `APP_ORIGIN=http://localhost:5173`, `COOKIE_SECURE=false`, and `COOKIE_SAME_SITE=lax`. The application rejects insecure `SameSite=None` configuration. Login and logout use matching cookie attributes. Third-party-cookie blocking in a browser can still prevent sessions when the frontend and API are on different sites.
