import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import TurndownService from "turndown";
import { prisma } from "../prisma/client";
import { ArticleRecord } from "../interface/ArtcileRecord";

const BASE = "https://elysiajs.com/docs";
const limit = pLimit(5);

export type ParsedDoc = {
  url: string;
  title: string;
  markdown: string;
};

async function insertData(data: ParsedDoc[]) {
  const articles: ArticleRecord[] = data.map((article): ArticleRecord => ({
    name: article.title,
    local_path: "",
    web_path: article.url,
    source_id: 6, // <-- Elysia
    content: article.markdown,
    content_type: "md",
  }));

  await prisma.article.createMany({
    data: articles,
    skipDuplicates: true,
  });
}

export async function crawlElysiaDocs() {
  const urls = await collectElysiaDocLinks();

  console.log(`Found ${urls.length} pages`);

  const results: ParsedDoc[] = [];

  await Promise.all(
    urls.map(url =>
      limit(async () => {
        try {
          const doc = await parseElysiaDocToMd(url);
          results.push(doc);
          console.log(`✔ ${url}`);
        } catch (e) {
          console.error(`✖ ${url}`, e);
        }
      })
    )
  );

  await insertData(results);
  return results;
}

export async function collectElysiaDocLinks(): Promise<string[]> {
  const { data: html } = await axios.get(BASE, {
    headers: {
      "User-Agent": "doc-parser",
    },
  });

  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // только страницы документации
    if (!href.startsWith("/docs")) return;
    if (href.includes("#")) return;

    const url = new URL(href, "https://elysiajs.com").toString();
    links.add(url);
  });

  return [...links];
}

export async function parseElysiaDocToMd(url: string): Promise<ParsedDoc> {
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent": "doc-parser",
    },
  });

  const $ = cheerio.load(html);

  const body =
    $("main article").first().length
      ? $("main article").first()
      : $("main").first();

  if (!body.length) {
    throw new Error("main content not found");
  }

  const title =
    body.find("h1").first().text().trim() ||
    $("title").text().replace(" · Elysia", "").trim();

  // чистка навигации
  body.find("nav").remove();
  body.find("aside").remove();
  body.find("header").remove();
  body.find("footer").remove();
  body.find(".toc").remove();
  body.find("a.header-anchor").remove();

  const turndown = new TurndownService({
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });

  const markdown = turndown
    .turndown(body.html() ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    url,
    title,
    markdown,
  };
}
