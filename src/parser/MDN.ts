import { t } from "elysia";
import { MdFile, scanDirectory } from "../utils/scanDirectory";


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

export const parseMDN = async () => {
    const files = await scanDirectory("./docs/mdn");
    console.log(processMdFiles(files));
}
