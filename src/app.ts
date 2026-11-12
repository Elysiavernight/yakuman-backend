import { Elysia, t } from "elysia";
import { and, eq, gt, lt, getTableColumns } from "drizzle-orm";
import { db, posts, publicUser } from "./db";
import { records, sessions, users } from "./schema";
import { tileIds, yakumans } from "./catalog";

const credentials = t.Object({
  username: t.String({
    minLength: 3,
    maxLength: 24,
    pattern: "^[a-zA-Z0-9_]+$",
  }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  name: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
});
const text = (max: number) => t.Optional(t.String({ maxLength: max }));
const failures = new Map<string, { count: number; until: number }>();
const digest = (s: string) =>
  new Bun.CryptoHasher("sha256").update(s).digest("hex");
function current(token: unknown) {
  if (typeof token !== "string") return null;
  const row = db
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .where(
      and(eq(sessions.token, digest(token)), gt(sessions.expires, Date.now())),
    )
    .get();
  return row ? publicUser(row) : null;
}
function validLink(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
function validImage(value: string) {
  if (!value) return true;
  if (value.startsWith("data:image/"))
    return (
      /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) &&
      value.length <= 7_000_000
    );
  return false;
}

export const app = new Elysia({
  serve: { maxRequestBodySize: 8 * 1024 * 1024 },
})
  .onBeforeHandle(({ request, status }) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const origin = request.headers.get("origin");
      const allowed = process.env.APP_ORIGIN ?? "http://localhost:5173";
      if (
        origin &&
        origin !== allowed &&
        origin !== new URL(request.url).origin
      )
        return status(403, {
          error: "This request came from an unrecognized origin.",
        });
    }
  })
  .onError(({ code, status, error }) => {
    if (code === "VALIDATION" || code === "PARSE")
      return status(400, {
        error:
          "Check your details and try again. Usernames need 3–24 letters, numbers or underscores; passwords need at least 8 characters.",
      });
    if (code === "NOT_FOUND")
      return status(404, { error: "That page could not be found." });
    console.error(error);
    return status(500, { error: "Something went wrong. Please try again." });
  })
  .get("/api/health", () => ({ ok: true }))
  .get("/api/catalog", () => ({
    yakumans: yakumans.map(({ tiles, ...metadata }) => metadata),
    tileIds,
  }))
  .get("/api/auth/me", ({ cookie }) => ({
    user: current(cookie.session?.value),
  }))
  .post(
    "/api/auth/:action",
    async ({ params, body, cookie, status, request }) => {
      if (!["login", "signup"].includes(params.action))
        return status(404, { error: "Unknown action." });
      const username = body.username.toLowerCase();
      const key = `${request.headers.get("x-real-ip") ?? "local"}:${username}`;
      const attempt = failures.get(key);
      if (attempt && attempt.until > Date.now() && attempt.count >= 10)
        return status(429, {
          error: "Too many attempts. Try again in 15 minutes.",
        });
      let row = db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .get();
      if (params.action === "signup") {
        if (row)
          return status(409, { error: "That username is already taken." });
        const name = (body.name ?? username).trim();
        if (!name)
          return status(400, { error: "Please enter a display name." });
        const password = await Bun.password.hash(body.password, {
          algorithm: "argon2id",
        });
        try {
          row = db
            .insert(users)
            .values({
              id: crypto.randomUUID(),
              username,
              name,
              password,
              createdAt: new Date().toISOString(),
            })
            .returning()
            .get();
        } catch {
          return status(409, { error: "That username is already taken." });
        }
      } else if (
        !row ||
        !(await Bun.password.verify(body.password, row.password))
      ) {
        if (failures.size > 5000) failures.clear();
        failures.set(key, {
          count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1,
          until: Date.now() + 900_000,
        });
        return status(401, { error: "The username or password is incorrect." });
      }
      failures.delete(key);
      db.delete(sessions).where(lt(sessions.expires, Date.now())).run();
      const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      db.insert(sessions)
        .values({
          token: digest(token),
          userId: row!.id,
          expires: Date.now() + 30 * 86400_000,
        })
        .run();
      cookie.session!.set({
        value: token,
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86400,
      });
      return { user: publicUser(row!) };
    },
    { body: credentials },
  )
  .post("/api/auth/logout", ({ cookie }) => {
    if (typeof cookie.session?.value === "string")
      db.delete(sessions)
        .where(eq(sessions.token, digest(cookie.session.value)))
        .run();
    cookie.session!.remove();
    return { ok: true };
  })
  .get("/api/posts", ({ query }) => {
    let result = posts();
    if (query.user) result = result.filter((p) => p.userId === query.user);
    if (query.type)
      result = result.filter((p) => p.types.includes(query.type!));
    if (query.platform)
      result = result.filter((p) => p.platform === query.platform);
    return { posts: result };
  })
  .post(
    "/api/posts",
    ({ body, cookie, status }) => {
      const user = current(cookie.session?.value);
      if (!user) return status(401, { error: "Log in to record a yakuman." });
      const types = [...new Set(body.types)];
      if (
        !types.length ||
        types.some((id) => !yakumans.some((y) => y.id === id))
      )
        return status(400, { error: "Choose at least one yakuman type." });
      const hand = body.hand ?? [];
      if (
        hand.some((id) => !tileIds.includes(id)) ||
        tileIds.some((id) => hand.filter((t) => t === id).length > 4) ||
        (hand.length > 0 && (hand.length < 14 || hand.length > 18))
      )
        return status(400, {
          error:
            "A hand needs 14–18 tiles, including quads, with at most four of each tile. You can also leave it empty.",
        });
      if (body.gameLink && !validLink(body.gameLink))
        return status(400, {
          error: "Use a complete http or https game link.",
        });
      if (!validImage(body.image ?? ""))
        return status(400, {
          error: "Choose a PNG, JPEG, GIF or WebP image under 5 MB.",
        });
      const id = crypto.randomUUID();
      db.insert(records)
        .values({
          id,
          userId: user.id,
          types,
          hand,
          description: body.description?.trim() ?? "",
          gameLink: body.gameLink ?? "",
          image: body.image ?? "",
          platform: body.platform ?? "Other",
          createdAt: new Date().toISOString(),
        })
        .run();
      return { post: posts().find((p) => p.id === id) };
    },
    {
      body: t.Object({
        types: t.Array(t.String(), { minItems: 1, maxItems: 16 }),
        hand: t.Optional(t.Array(t.String(), { maxItems: 18 })),
        description: text(2000),
        gameLink: text(2000),
        image: text(7_000_000),
        platform: t.Optional(
          t.Union([
            t.Literal("Mahjong Soul"),
            t.Literal("Tenhou"),
            t.Literal("Riichi City"),
            t.Literal("In person"),
            t.Literal("Other"),
          ]),
        ),
      }),
    },
  )
  .patch(
    "/api/posts/:id",
    ({ params, body, cookie, status }) => {
      const user = current(cookie.session?.value);

      if (!user) {
        return status(401, { error: "Please log in to edit your record." });
      }

      const ownedPost = and(
        eq(records.id, params.id),
        eq(records.userId, user.id),
      );

      const existing = db.select().from(records).where(ownedPost).get();

      if (!existing) {
        return status(404, { error: "That record was not found." });
      }

      const values = {
        types: [...new Set(body.types)],
        hand: body.hand ?? existing.hand,
        description: body.description?.trim() ?? existing.description,
        gameLink: body.gameLink ?? existing.gameLink,
        image: body.image ?? existing.image,
        platform: body.platform ?? existing.platform,
      };

      if (
        !values.types.length ||
        values.types.some((id) => !yakumans.some((y) => y.id === id))
      ) {
        return status(400, { error: "Choose at least one yakuman type." });
      }

      if (
        values.hand.some((id) => !tileIds.includes(id)) ||
        tileIds.some(
          (id) => values.hand.filter((tile) => tile === id).length > 4,
        ) ||
        (values.hand.length > 0 &&
          (values.hand.length < 14 || values.hand.length > 18))
      ) {
        return status(400, {
          error:
            "A hand needs 14–18 tiles, with at most four of each tile. You can also leave it empty.",
        });
      }

      if (values.gameLink && !validLink(values.gameLink)) {
        return status(400, {
          error: "Use a complete http or https game link.",
        });
      }

      if (!validImage(values.image)) {
        return status(400, {
          error: "Choose a PNG, JPEG, GIF or WebP image under 5 MB.",
        });
      }

      const updated = db
        .update(records)
        .set(values)
        .where(ownedPost)
        .returning({ id: records.id })
        .get();

      if (!updated) {
        return status(404, { error: "That record was not found." });
      }

      return {
        post: posts().find((post) => post.id === updated.id),
      };
    },
    {
      body: t.Object({
        types: t.Array(t.String(), { minItems: 1, maxItems: 16 }),
        hand: t.Optional(t.Array(t.String(), { maxItems: 18 })),
        description: text(2000),
        gameLink: text(2000),
        image: text(7_000_000),
        platform: t.Optional(
          t.Union([
            t.Literal("Mahjong Soul"),
            t.Literal("Tenhou"),
            t.Literal("Riichi City"),
            t.Literal("In person"),
            t.Literal("Other"),
          ]),
        ),
      }),
    },
  )
  .delete("/api/posts/:id", ({ params, cookie, status }) => {
    const user = current(cookie.session?.value);
    if (!user) return status(401, { error: "Please log in." });
    const deleted = db
      .delete(records)
      .where(and(eq(records.id, params.id), eq(records.userId, user.id)))
      .returning({ id: records.id })
      .get();
    if (!deleted) return status(404, { error: "That record was not found." });
    return { ok: true };
  })
  .get("/api/stats", () => {
    const all = posts();
    const types = yakumans
      .map((y) => ({
        id: y.id,
        count: all.filter((p) => p.types.includes(y.id)).length,
      }))
      .sort((a, b) => b.count - a.count);
    const players = db.select().from(users).all();
    const leaders = players
      .map((u) => ({
        user: publicUser(u),
        count: all.filter((p) => p.userId === u.id).length,
      }))
      .sort(
        (a, b) => b.count - a.count || a.user.name.localeCompare(b.user.name),
      );
    return {
      total: all.length,
      players: players.length,
      unique: types.filter((t) => t.count).length,
      doubles: all.filter(
        (p) =>
          p.types.reduce(
            (n, id) => n + (yakumans.find((y) => y.id === id)?.multiplier ?? 0),
            0,
          ) >= 2,
      ).length,
      types,
      leaders,
    };
  })
  .get("/api/users/:id", ({ params, status }) => {
    const row = db.select().from(users).where(eq(users.id, params.id)).get();
    return row
      ? { user: publicUser(row) }
      : status(404, { error: "That player could not be found." });
  })
  .patch(
    "/api/profile",
    ({ body, cookie, status }) => {
      const user = current(cookie.session?.value);
      if (!user)
        return status(401, { error: "Please log in to edit your profile." });
      if (!body.name.trim())
        return status(400, { error: "Please enter a display name." });
      if (!validImage(body.avatar ?? ""))
        return status(400, { error: "Choose a profile image under 5 MB." });
      const updated = db
        .update(users)
        .set({
          name: body.name.trim(),
          bio: body.bio ?? "",
          pronouns: body.pronouns?.trim() ?? user.pronouns,
          avatar: body.avatar ?? "",
        })
        .where(eq(users.id, user.id))
        .returning()
        .get()!;
      return {
        user: publicUser(updated),
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 40 }),
        bio: text(300),
        pronouns: text(40),
        avatar: text(7_000_000),
      }),
    },
  );
