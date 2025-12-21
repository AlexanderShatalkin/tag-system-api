import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import TurndownService from "turndown";
import { prisma } from "../prisma/client";
import { ArticleRecord } from "../interface/ArtcileRecord";

const BASE = "https://www.postgresql.org/docs/current";
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
    source_id: 3, // <-- другой source_id под Postgres
    content: article.markdown,
    content_type: "md",
  }));

  await prisma.article.createMany({
    data: articles,
    skipDuplicates: true,
  });
}

export async function crawlPostgresDocs() {
  const urls = await collectPostgresDocLinks();

  console.log(`Found ${urls.length} pages`);

  const results: ParsedDoc[] = [];

  await Promise.all(
    urls.map(url =>
      limit(async () => {
        try {
          const doc = await parsePostgresDocToMd(url);
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

export async function collectPostgresDocLinks(): Promise<string[]> {
  const { data: html } = await axios.get(`${BASE}/index.html`, {
    headers: {
      "User-Agent": "doc-parser",
    },
  });

  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // интересуют только html внутри docs/current
    if (!href.endsWith(".html")) return;
    if (href.startsWith("http")) return;

    const url = new URL(href, `${BASE}/`).toString();
    links.add(url);
  });

  return [...links];
}

export async function parsePostgresDocToMd(url: string): Promise<ParsedDoc> {
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent": "doc-parser",
    },
  });

  const $ = cheerio.load(html);

  const body = $("#docContent").first();

  if (!body.length) {
    throw new Error("docContent not found");
  }

  const title =
    body.find("h1").first().text().trim() ||
    $("title").text().replace("PostgreSQL", "").trim();

  // чистка мусора
  body.find(".navheader").remove();
  body.find(".navfooter").remove();
  body.find(".toc").remove();
  body.find("nav").remove();
  body.find("a.headerlink").remove();

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
