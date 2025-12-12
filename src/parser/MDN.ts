import { t } from "elysia";
import { MdFile, scanDirectory } from "../utils/scanDirectory";
import { ArticleRecord } from "../interface/ArtcileRecord";
import { prisma } from "../prisma/client";


export interface MDNArticle {
    fullPath: string; 
    route: string;    
    name: string;     
}


function processMdFiles(files: MdFile[]): MDNArticle[] {
    return files.map(file => {
        const normalized = file.path.replace(/\\/g, "/");
        const withoutRoot = normalized.split("/").slice(1).join("/");
        const withoutFile = withoutRoot.replace(/\/index\.md$/, "");
        const parts = withoutFile.split("/");
        const route = parts.slice(1).join("/");
        const name = parts[parts.length - 1];
        return {
            fullPath: normalized,
            route: route,
            name: name
        };
    });
}

function prepareArticle({ fullPath, route, name }: MDNArticle): ArticleRecord {
    return {
        name,
        local_path: fullPath,
        web_path: `https://developer.mozilla.org/${route}`,
        source_id: 1
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
    const processedFiles = processMdFiles(files);
    const articles  = processedFiles.map(f => prepareArticle(f));

    await insertArticles(articles);
}
