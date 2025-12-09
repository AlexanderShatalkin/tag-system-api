import { Elysia } from "elysia";
import { parseMDN } from "./parser/MDN";
import { scanDirectory } from "./utils/scanDirectory";

const app = new Elysia()
  .group("/internal/parse", (app) =>
    app
      .get('/parseMDN', async () => {
        parseMDN();
      }) 
  )
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
