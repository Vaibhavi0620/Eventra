/**
 * Backend photo tool (no login needed; requires access to the server/database).
 *
 *   npm run event-image -- list
 *   npm run event-image -- set "<event id or part of its name>" ./photo.jpg
 *   npm run event-image -- hero ./photo.jpg      (homepage hero -> frontend/public/images/hero.jpg)
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { saveEventImage, deleteUploadedImage, detectImageType } from "../lib/imageUpload";

async function main() {
  const [cmd, a, b] = process.argv.slice(2);

  if (cmd === "list") {
    const events = await prisma.event.findMany({ select: { id: true, name: true, imageUrl: true }, orderBy: { name: "asc" } });
    events.forEach((e) => console.log(`${e.id}  ${e.name}  [${e.imageUrl}]`));
    return;
  }

  if (cmd === "hero") {
    if (!a) throw new Error("Usage: hero <image file>");
    const buf = fs.readFileSync(path.resolve(a));
    if (!detectImageType(buf)) throw new Error("Hero must be a JPEG, PNG or WebP file.");
    const dest = path.resolve(process.cwd(), "../frontend/public/images/hero.jpg");
    fs.writeFileSync(dest, buf);
    console.log(`Hero updated: ${dest}`);
    return;
  }

  if (cmd === "set") {
    if (!a || !b) throw new Error('Usage: set "<event id or name fragment>" <image file>');
    const matches = await prisma.event.findMany({
      where: { OR: [{ id: a }, { name: { contains: a, mode: "insensitive" } }] },
    });
    if (matches.length !== 1) {
      throw new Error(
        matches.length === 0
          ? `No event matches "${a}". Run: npm run event-image -- list`
          : `"${a}" matches ${matches.length} events; use the exact id.`
      );
    }
    const event = matches[0];
    const url = await saveEventImage(event.id, fs.readFileSync(path.resolve(b)));
    await prisma.event.update({ where: { id: event.id }, data: { imageUrl: url } });
    await deleteUploadedImage(event.imageUrl);
    console.log(`Updated "${event.name}" -> ${url}`);
    return;
  }

  console.log("Commands: list | set <event> <file> | hero <file>");
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
