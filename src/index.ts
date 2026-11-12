import { app } from "./app";

app.listen({
  port: Number(process.env.API_PORT ?? 11000),
  hostname: "0.0.0.0",
});
console.log(`Elysia is listening at ${app.server?.url}`);
