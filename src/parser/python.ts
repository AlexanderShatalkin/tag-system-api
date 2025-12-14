import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import TurndownService from "turndown";
import { prisma } from "../prisma/client";
import { ArticleRecord } from "../interface/ArtcileRecord";

const BASE = "https://docs.python.org"

const limit = pLimit(5);

export type ParsedDoc = {
  url: string;
  title: string;
  markdown: string;
};

async function insertData(data: ParsedDoc[]){
  const articles: ArticleRecord[] = data.map((article): ArticleRecord => {
    return {
      name: article.title,
      local_path: "",
      web_path: article.url,
      source_id: 2,
      content: article.markdown,
      content_type: "md",
    }
  })  
  
  await prisma.article.createMany({
      data: articles,
      skipDuplicates: true
    })
}

export async function crawlPythonLibrary() {
  const urls = await collectPythonLibraryLinks();

  console.log(`Found ${urls.length} pages`);

  const results: ParsedDoc[] = [];

  await Promise.all(
    urls.map(url =>
      limit(async () => {
        try {
          const doc = await parsePythonDocToMd(url);
          
          results.push(doc);
          console.log(`✔ ${url}`);
        } catch (e) {
          console.error(`✖ ${url}`, e);
        }
      })
    )
  );

  await insertData(results)

  return results;
}

export async function collectPythonLibraryLinks(): Promise<string[]> {
  const { data: html } = await axios.get(
    `${BASE}/3/library/index.html`
  );

  const $ = cheerio.load(html);

  const links = new Set<string>();

  $("a.reference.internal[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || !href.endsWith(".html")) return;

    const url = new URL(href, `${BASE}/3/library/`).toString();
    links.add(url);
  });

  return [...links];
}



export async function parsePythonDocToMd(url: string): Promise<ParsedDoc> {
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent": "doc-parser"
    }
  });

  const $ = cheerio.load(html);

  const body = $("div.body").first();

  const title =
    body.find("h1").first().text().trim() ||
    $("title").text().replace(" — Python documentation", "").trim();

  body.find(".headerlink").remove();
  body.find(".toc").remove();
  body.find("nav").remove();

  const turndown = new TurndownService({
    codeBlockStyle: "fenced",
    emDelimiter: "*"
  });

  const markdown = turndown.turndown(body.html() ?? "").replace(/\n{3,}/g, "\n\n").trim();
  return {
    url: url,
    title: title,
    markdown: markdown
  }
    
}