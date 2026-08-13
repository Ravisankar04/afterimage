const fs = require("fs");
const path = require("path");

const dir = path.join("apps/web/src/app/afterimage", "[id]");
const page = path.join(dir, "page.tsx");
const client = path.join(dir, "AfterimageDetailClient.tsx");

let src = fs.readFileSync(page, "utf8");
src = src.replace(
  "export default function AfterimageDetailPage()",
  "export function AfterimageDetailClient()",
);
fs.writeFileSync(client, src);

const wrapper = `import { DEMO_AFTERIMAGES } from "@/lib/demo-data";
import { AfterimageDetailClient } from "./AfterimageDetailClient";

export function generateStaticParams() {
  return DEMO_AFTERIMAGES.map((item) => ({ id: item.id }));
}

export default function AfterimageDetailPage() {
  return <AfterimageDetailClient />;
}
`;

fs.writeFileSync(page, wrapper);
console.log("ok", fs.readdirSync(dir));
