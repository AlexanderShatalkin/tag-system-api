
import OpenAI from "openai";
import { readFile } from "fs/promises";
import { build } from "bun";
import { Article } from "@prisma/client";
import { prisma } from "../prisma/client";

async function buildPromt(article: string, jsonTagsUrl="./src/tags/tags.json"): Promise<string>{
    const tags = await readFile(jsonTagsUrl, "utf8");
    return  `
      Проанализируй статью и присвой ей теги из категории со значениями от 0 до 100:

      Теги:
      ${tags}

      Статья:
      ${article}

      Ответ верни строго в виде JSON.
        `.trim();
}


async function saveTagScores(articleId: number, modelName: string, scores: any) {
  let model = await prisma.model.findFirst({
    where: { name: modelName },
  });

  if (!model) {
    model = await prisma.model.create({
      data: { name: modelName },
    });
  }

  for (const category of Object.keys(scores)) {
    const tagsObj = scores[category];

    for (const tagName of Object.keys(tagsObj)) {
      const weight = tagsObj[tagName];

      let tag = await prisma.tag.findFirst({
        where: {
          name: tagName,
          type: category,
        },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName,
            type: category,
          },
        });
      }

      await prisma.tag_Score.upsert({
        where: {
          article_id_tag_id_model_id: {
            article_id: articleId,
            tag_id: tag.id,
            model_id: model.id,
          },
        },
        create: {
          article_id: articleId,
          tag_id: tag.id,
          model_id: model.id,
          weight: weight,
        },
        update: {
          weight: weight,
        },
      });
    }
  }
}


export function safeParseTagScores(raw: string): Record<string, Record<string, number>> {
  let jsonText = raw.trim();

  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("LLM response is not valid JSON");
  }

  const out: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(parsed)) {
    const value = parsed[category];

    if (typeof value !== "object" || Array.isArray(value) || value === null) {
      console.warn("Skipping invalid category:", category);
      continue;
    }

    out[category] = {};

    for (const tag of Object.keys(value)) {
      const weight = value[tag];

      const num = Number(weight);

      if (!Number.isFinite(num) || num < 0 || num > 100) {
        console.warn("Skipping invalid weight:", category, tag, weight);
        continue;
      }

      out[category][tag] = num;
    }
  }

  if (Object.keys(out).length === 0) {
    throw new Error("Parsed JSON does not contain any valid tag scores");
  }

  return out;
}


export async function getTags(article: Article){
    const promt = await buildPromt(article.content);
    
    const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
    });
    const response = await client.responses.create({
        model: "openai/gpt-oss-20b",
        input: promt
    });
    const json = response.output_text;
    const scores = safeParseTagScores(json);
    await saveTagScores(article.id, 'gtt-oss-20b', scores);

    return response
}
