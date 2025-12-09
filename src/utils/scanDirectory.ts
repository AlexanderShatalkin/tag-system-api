import { promises as fs } from "fs";
import * as path from "path";

export interface MdFile {
    path: string;
}

export async function scanDirectory(dir: string): Promise<MdFile[]> {
    console.log('here')
    const result: MdFile[] = [];
    await scan(dir, result);
    return result;
}

async function scan(currentPath: string, result: MdFile[]) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
            await scan(fullPath, result);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            result.push({ path: fullPath });
        }
    }
}