import { prisma } from "../prisma/client";
import fs from "fs";
import path from "path";

export async function seedTags(){
  const dataPath = path.join("./src/tags", "tags.json");
  const raw = fs.readFileSync(dataPath, "utf8");
  const tagsJson = JSON.parse(raw);
  
  for (const category of Object.keys(tagsJson)) {
    const tags = tagsJson[category];

    console.log(`\n▶ Category: ${category}`);

    for (const tag of tags) {
      const existing = await prisma.tag.findFirst({
        where: { name: tag, type: category }
      });

      if (existing) {
        console.log(`  • Already exists: ${tag}`);
        continue;
      }

      await prisma.tag.create({
        data: {
          name: tag,
          type: category,
        }
      });

      console.log(`  + Inserted: ${tag}`);
    }
  }
}
