import { Elysia, t } from "elysia";
import { parseMDN } from "./parser/MDN";
import { scanDirectory } from "./utils/scanDirectory";
import { getTags } from "./tagging/groqTagApi";
import { readFile } from "fs/promises";
import { prisma } from "./prisma/client";
import { swagger } from "@elysiajs/swagger";
import { seedTags } from "./utils/seedTags";
import {openapi} from "@elysiajs/openapi"
import { crawlPythonLibrary, parsePythonDocToMd } from "./parser/python";

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
  .use(openapi())
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
      .post("parsePython", async () => {
        return crawlPythonLibrary();
      })
  )
  .group("/internal/tag", (app) => 
  app
  .post("/tagArticleById/:id", async ({params}) => {
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
  })
  .post("tagArticlesByIdRange", async({body}) => {
    const min = body.minId
    const max = body.maxId
    const articles = await prisma.article.findMany({
      where:{
        id:{
          gte: min,
          lte: max
        },
        tagScores: {
          none: {},
        }
      },
      orderBy:{
        id: "asc"
      }
    })

for (const article of articles) {
  try {
    await getTags(article)
  } catch (error: any) {
    if (
      error?.code === "rate_limit_exceeded" ||
      error?.status === 429 ||
      error?.message?.includes("Rate limit")
    ) {
      
      console.error("❌ Tokens limit reached. Stopping tagging.")
      break 
    }

    console.error(`Error tagging article ${article.id}`, error)
  }
}



    
  },
  {
    body: t.Object({
      minId: t.Numeric(),
      maxId: t.Numeric(),
    })
  })
  
  )
  .get("/getArticlesByTag", async ({query}) => {
    const { tag, minScore, model, source } = query

  const articles = await prisma.article.findMany({
    where: {
      ...(source && {
        source: {
          name: source
        }
      }),

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
            },
            ...(model
              ? [{
                  model: {
                    name: model
                  }
                }]
              : [])
          ]
        }
      }
    },

    include: {
      tagScores: {
        where: {
          weight: {
            gt: minScore
          },
          tag: {
            name: tag
          },
          ...(model && {
            model: {
              name: model
            }
          })
        },
        include: {
          tag: true,
          model: true
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
      model: t.Optional(t.String()),
      source: t.Optional(t.String())
    })
  })
  .get("/tags", async () => {
    const tags = prisma.tag.findMany({

    });
    return tags;
  })
  .get("/getArticleTags", async ({query}) => {
    const {id} = query
     const article = await prisma.article.findUnique({
    where: { id: id },
    select: {
      id: true,
      name: true,
      tagScores: {
        where: {
          weight: {
            gt: 0,
          },
        },
        select: {
          weight: true,
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          model: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!article) return [];

  return article.tagScores.map(ts => ({
    tagId: ts.tag.id,
    tagName: ts.tag.name,
    tagType: ts.tag.type,
    weight: ts.weight,
    model: ts.model.name,
  }));
  },
  {
    query: t.Object({
      id: t.Number()
    })
  }
)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
