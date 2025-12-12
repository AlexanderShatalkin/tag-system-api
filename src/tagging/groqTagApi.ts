
import OpenAI from "openai";
import { readFile } from "fs/promises";
import { build } from "bun";

async function buildPromt(articleUrl: string, jsonTagsUrl="./src/tags/tags.json"): Promise<string>{
    const article = await readFile(articleUrl, "utf8");
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

export async function getTags(articleUrl: string){
    const promt = await buildPromt(articleUrl);
    
    const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
    });

    const response = await client.responses.create({
        model: "openai/gpt-oss-20b",
        input: promt
    });

    return response
}
