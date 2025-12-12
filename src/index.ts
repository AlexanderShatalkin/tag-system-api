import { Elysia } from "elysia";
import { parseMDN } from "./parser/MDN";
import { scanDirectory } from "./utils/scanDirectory";
import { getTags } from "./tagging/groqTagApi";
import { readFile } from "fs/promises";

const app = new Elysia()
  .group("/internal/parse", (app) =>
    app
      .post('/parseMDN', async () => {
        parseMDN();
      }) 
  )
  .group("interlnal/tag", (app) => 
  app.get("test", async () => {


    const article = await readFile("./docs/mdn/en-us/docs/web/javascript/guide/index.md", "utf8");
    const tags = await readFile("./src/tags/tags.json", "utf8");
  const prompt = `
      Проанализируй статью и присвой ей теги из категории со значениями от 0 до 100:

      Теги (tag.json):
      ${tags}

      Статья (index.md):
      ${article}

      Ответ верни строго в виде JSON.
        `.trim();

    const response  = await getTags(prompt)
    console.log(response.output_text)
    console.log(response)

  })
  )
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
