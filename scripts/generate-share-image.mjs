// Generate the checked-in PNG after editing assets/social/planner-together.svg.
// Requires an installed Korean font listed in the SVG (Apple SD Gothic Neo or
// Noto Sans CJK KR). Sharing the PNG does not require a font or image service.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const input = fileURLToPath(new URL("../assets/social/planner-together.svg", import.meta.url));
const directory = new URL("../public/og/", import.meta.url);
const output = fileURLToPath(new URL("planner-together-v1.png", directory));

await mkdir(directory, { recursive: true });
await sharp(input).png({ compressionLevel: 9 }).toFile(output);
console.log(output);
