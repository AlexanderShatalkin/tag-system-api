import { t } from "elysia";
import { MdFile, scanDirectory } from "../utils/scanDirectory";
import { ArticleRecord } from "../interface/ArtcileRecord";
import { prisma } from "../prisma/client";
import { readFile } from "fs/promises";

export interface MDNArticle {
    fullPath: string; 
    route: string;    
    name: string;    
    content: string; 
}


async function processMdFiles(files: MdFile[]): Promise<MDNArticle[]> {
    const promises = files.map(async (file) => {
        const normalized = file.path.replace(/\\/g, "/");
        const withoutRoot = normalized.split("/").slice(1).join("/");
        const withoutFile = withoutRoot.replace(/\/index\.md$/, "");
        const parts = withoutFile.split("/");
        const route = parts.slice(1).join("/");
        const name = parts[parts.length - 1];
        const content = await readFile(file.path, "utf8");
        return {
            fullPath: normalized,
            route: route,
            name: name,
            content: content
        };
    });

    return Promise.all(promises);
}

function prepareArticle({ fullPath, route, name, content }: MDNArticle): ArticleRecord {
    return {
        name,
        local_path: fullPath,
        web_path: `https://developer.mozilla.org/${route}`,
        source_id: 1,
        content: content,
        content_type: "md"
    };
}

async function insertArticles(list: ArticleRecord[]) {
    await prisma.article.createMany({
        data: list,
        skipDuplicates: true
    });
}

export const parseMDN = async () => {
    const files = await scanDirectory("./docs/mdn");
    const processedFiles = await processMdFiles(files);
    const articles  = processedFiles.map(f => prepareArticle(f));

    await insertArticles(articles);
}
