FROM oven/bun:1.3.5 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.5 AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=11000 \
    DATABASE_PATH=/app/data/yakuman.sqlite

COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun drizzle ./drizzle
RUN mkdir -p /app/data && chown bun:bun /app/data

USER bun
EXPOSE 11000
CMD ["bun", "src/index.ts"]
