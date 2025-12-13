import { Elysia, t } from "elysia";
import { parseMDN } from "./parser/MDN";
import { scanDirectory } from "./utils/scanDirectory";
import { getTags } from "./tagging/groqTagApi";
import { readFile } from "fs/promises";
import { prisma } from "./prisma/client";
import { swagger } from "@elysiajs/swagger";
import { seedTags } from "./utils/seedTags";

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "Tag system api",
          version: "1.0.0",
        },
      },
    })
  )
  .group("/internal/seed", (app) => 
    app.
      post("/tags", async () => {
        seedTags();
      })
  )
  .group("/internal/parse", (app) =>
    app
      .post('/parseMDN', async () => {
        parseMDN();
      }) 
  )
  .group("/internal/tag", (app) => 
  app.post("/tagArticleById/:id", async ({params}) => {
    const articleId = Number(params.id)
    const article = await prisma.article.findUnique({
      where: {
        id: articleId,
      }
    });

    if (article){
      const tags =  await getTags(article);
      
      return tags;
    }
    else{
      throw new Error("article not fount");
    }

  },
  {
    params: t.Object({
      id: t.Numeric(),
    })
  }

  )
  )
  .get("/", () => "Hello Elysia")
  .get("/getArticlesByTag", async ({query}) => {
    const { tag, minScore } = query

    const articles = await prisma.article.findMany({
      where: {
        tagScores: {
          some: {
            AND: [
              {
                tag: {
                  name: tag
                }
              },
              {
                weight: {
                  gt: minScore
                }
              }
            ]
          }
        }
      },
      include: {
        tagScores: {
          include: {
            tag: true,
            model: true
          },
          where: {
            weight: {
              gt: minScore
            },
            tag: {
              name: tag
            }
          }
        },
        source: true
      }
    })

    return articles
  },
  {
    query: t.Object({
      tag: t.String(),
      minScore: t.Numeric(),
    })
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
